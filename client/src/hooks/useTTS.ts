import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "../lib/audioContext";
import { apiUrl } from "../lib/apiBase";

const TTS_URL = apiUrl("/api/tts");

/** Tiny silent WAV — unlocks autoplay when played during a user gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAAB9AAAB9AAABQ==";

export interface UseTTSOptions {
  speed?: number;
  voice?: string;
}

export interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  unlockAudio: () => void;
  isSpeaking: boolean;
  error: string | null;
  lastSource: "sarvam" | "openai" | null;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useTTS(options?: UseTTSOptions): UseTTSReturn {
  const speed = options?.speed ?? 1.1;
  const voice = options?.voice ?? "meera";

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<"sarvam" | "openai" | null>(
    null
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const isSpeakingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const unlockElementRef = useRef<HTMLAudioElement | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopWebAudio = useCallback(() => {
    const source = sourceNodeRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      sourceNodeRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopWebAudio();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audioRef.current = null;
    }
    revokeObjectUrl();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, [revokeObjectUrl, stopWebAudio]);

  const unlockAudio = useCallback(() => {
    audioContextRef.current = getAudioContext();
    void audioContextRef.current.resume();

    if (!unlockElementRef.current) {
      const el = new Audio(SILENT_WAV);
      el.volume = 0.001;
      unlockElementRef.current = el;
    }

    void unlockElementRef.current.play().catch(() => {});
  }, []);

  const finishSpeaking = useCallback(
    (source: "sarvam" | "openai") => {
      revokeObjectUrl();
      audioRef.current = null;
      sourceNodeRef.current = null;
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setLastSource(source);
    },
    [revokeObjectUrl]
  );

  const playWithWebAudio = useCallback(
    async (blob: Blob, playbackSpeed: number, source: "sarvam" | "openai") => {
      const ctx = audioContextRef.current ?? getAudioContext();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      if (ctx.state !== "running") {
        return false;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

      stopWebAudio();

      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.playbackRate.value = playbackSpeed;
      bufferSource.connect(ctx.destination);
      sourceNodeRef.current = bufferSource;

      bufferSource.onended = () => finishSpeaking(source);

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      bufferSource.start(0);
      return true;
    },
    [finishSpeaking, stopWebAudio]
  );

  const playWithElement = useCallback(
    async (blob: Blob, playbackSpeed: number, source: "sarvam" | "openai") => {
      revokeObjectUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.onended = () => finishSpeaking(source);

      setIsSpeaking(true);
      isSpeakingRef.current = true;

      try {
        await audio.play();
      } catch (playErr) {
        unlockAudio();
        try {
          await audio.play();
        } catch (retryErr) {
          throw retryErr ?? playErr;
        }
      }
    },
    [finishSpeaking, revokeObjectUrl, unlockAudio]
  );

  const speak = useCallback(
    async (text: string) => {
      if (isSpeakingRef.current) {
        stop();
      }

      setError(null);

      unlockAudio();

      try {
        const res = await fetch(TTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed, voice }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("[TTS] HTTP", res.status, detail.slice(0, 200));
          setError("Couldn't play audio");
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          return;
        }

        const contentType = res.headers.get("Content-Type") ?? "";

        let blob: Blob;
        let source: "sarvam" | "openai";

        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { audio?: string };
          if (!data.audio) {
            console.error("[TTS] JSON response missing audio field");
            setError("Couldn't play audio");
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            return;
          }
          const bytes = decodeBase64ToBytes(data.audio);
          blob = new Blob([bytes], { type: "audio/wav" });
          source = "sarvam";
        } else if (contentType.includes("audio/mpeg")) {
          const buffer = await res.arrayBuffer();
          blob = new Blob([buffer], { type: "audio/mpeg" });
          source = "openai";
        } else {
          console.error("[TTS] Unexpected Content-Type:", contentType);
          setError("Couldn't play audio");
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          return;
        }

        const playedWithWebAudio = await playWithWebAudio(blob, speed, source);
        if (!playedWithWebAudio) {
          await playWithElement(blob, speed, source);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown playback error";
        console.error("[TTS] Playback failed:", message, err);
        stop();
        setError("Couldn't play audio");
      }
    },
    [speed, voice, stop, playWithWebAudio, playWithElement, unlockAudio]
  );

  useEffect(() => {
    return () => {
      stop();
      audioContextRef.current = null;
    };
  }, [stop]);

  return { speak, stop, unlockAudio, isSpeaking, error, lastSource };
}
