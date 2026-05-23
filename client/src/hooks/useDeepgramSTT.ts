import { useCallback, useEffect, useRef, useState } from "react";

/** Relative URL — Vite proxies /api → localhost:3001 in dev; Express serves it in prod. */
const DEEPGRAM_TOKEN_URL = "/api/deepgram-token";

export interface UseDeepgramSTTOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  /** Fired when mic + WebSocket are ready — not on auto-reconnect. */
  onListening?: () => void;
}

export interface UseDeepgramSTTReturn {
  start: () => Promise<void>;
  stop: () => void;
  isListening: boolean;
  error: string | null;
}

interface DeepgramMessage {
  type?: string;
  is_final?: boolean;
  channel?: {
    alternatives?: Array<{ transcript?: string }>;
  };
}

export function useDeepgramSTT(
  options: UseDeepgramSTTOptions
): UseDeepgramSTTReturn {
  const { onFinal, onInterim, onListening } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectCountRef = useRef(0);
  const manualStopRef = useRef(false);
  const isListeningRef = useRef(false);
  const isReconnectingRef = useRef(false);

  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onListeningRef = useRef(onListening);
  const startRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
    onListeningRef.current = onListening;
  }, [onFinal, onInterim, onListening]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const cleanupSession = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Recorder may already be stopped.
      }
    }
    mediaRecorderRef.current = null;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      try {
        wsRef.current.close();
      } catch {
        // Socket may already be closed.
      }
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    const isReconnect = isReconnectingRef.current;
    isReconnectingRef.current = false;

    if (!isReconnect) {
      manualStopRef.current = false;
      reconnectCountRef.current = 0;
    }

    cleanupSession();
    setError(null);

    let key: string;
    try {
      const tokenRes = await fetch(DEEPGRAM_TOKEN_URL);
      if (!tokenRes.ok) {
        const backendDown =
          tokenRes.status === 500 ||
          tokenRes.status === 502 ||
          tokenRes.status === 503 ||
          tokenRes.status === 504;
        setError(
          backendDown
            ? "Backend not running. Start it: cd server && node index.js"
            : `Voice token request failed (HTTP ${tokenRes.status}).`
        );
        setIsListening(false);
        return;
      }
      const data = (await tokenRes.json()) as { key?: string };
      if (!data.key) {
        setError(
          "Deepgram API key missing on server. Set DEEPGRAM_API_KEY in server/.env."
        );
        setIsListening(false);
        return;
      }
      key = data.key;
    } catch (err) {
      console.error("[Deepgram STT] Token fetch failed", err);
      setError(
        "Cannot reach backend. Run the server on port 3001 and open the app at http://localhost:5173."
      );
      setIsListening(false);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError")
      ) {
        setError(
          "Microphone access denied. Please allow mic access in your browser settings."
        );
      } else {
        setError("Could not access microphone.");
      }
      setIsListening(false);
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    // Browsers cannot set Authorization on WebSocket; Deepgram uses subprotocol auth.
    // Note: utterance_end_ms rejects the handshake (1006); endpointing alone handles pauses.
    const wsUrl =
      "wss://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&punctuate=true&endpointing=600&interim_results=true";
    const ws = new WebSocket(wsUrl, ["token", key]);
    wsRef.current = ws;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (
        event.data.size > 0 &&
        wsRef.current?.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(event.data);
      }
    };

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      recorder.start(250);
      setIsListening(true);
      if (!isReconnect) {
        onListeningRef.current?.();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as DeepgramMessage;
        if (data.type !== "Results") return;

        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
        if (!transcript) return;

        if (data.is_final) {
          onFinalRef.current(transcript);
        } else {
          onInterimRef.current?.(transcript);
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onerror = (event) => {
      console.error("[Deepgram STT] WebSocket error", event);
      setError("Voice connection lost. Tap mic to reconnect.");
    };

    ws.onclose = (event) => {
      console.error(
        "[Deepgram STT] WebSocket closed",
        { code: event.code, reason: event.reason || "(none)", wasClean: event.wasClean }
      );

      if (manualStopRef.current) {
        setIsListening(false);
        return;
      }

      cleanupSession();
      setIsListening(false);

      if (reconnectCountRef.current < 3) {
        reconnectCountRef.current += 1;
        setTimeout(() => {
          if (!manualStopRef.current) {
            isReconnectingRef.current = true;
            void startRef.current();
          }
        }, 1000);
      } else {
        setError("Voice connection lost. Tap mic to reconnect.");
      }
    };
  }, [cleanupSession]);

  startRef.current = start;

  const stop = useCallback(() => {
    manualStopRef.current = true;
    isReconnectingRef.current = false;
    reconnectCountRef.current = 0;
    cleanupSession();
    setIsListening(false);
  }, [cleanupSession]);

  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        manualStopRef.current = true;
        isReconnectingRef.current = false;
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            // Recorder may already be stopped.
          }
        }
        mediaRecorderRef.current = null;
        if (wsRef.current) {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          try {
            wsRef.current.close();
          } catch {
            // Socket may already be closed.
          }
          wsRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    };
  }, []);

  return { start, stop, isListening, error };
}
