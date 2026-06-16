import { useCallback, useEffect, useRef, useState } from "react";
import MicButton from "./MicButton";
import { useVoiceSettings } from "./SessionSettings";
import { useDeepgramSTT } from "../hooks/useDeepgramSTT";
import { useTTS } from "../hooks/useTTS";
import { extractTargetWord } from "../lib/extractWord";
import { playPing } from "../lib/playPing";
import { apiUrl } from "../lib/apiBase";
import type { LookupResult } from "../types/lookup";

type VoiceMode = "quick" | "simple" | "feel-it";
type VoiceStatus = "idle" | "listening" | "fetching" | "speaking" | "error";

interface BookContext {
  bookName: string;
  description?: string;
}

export interface VoiceLayerProps {
  mode: VoiceMode;
  bookContext?: BookContext;
  micMode?: "push" | "session";
  sessionMinutes?: number;
  onResult?: (result: LookupResult) => void;
  onQuery?: (word: string) => void;
}

function buildSpeakText(
  word: string,
  definition: string,
  result: LookupResult,
  currentMode: VoiceMode,
  wordFirst: boolean,
): string {
  if (!wordFirst) return definition;

  if (currentMode === "feel-it" && result.contextualResonance) {
    return `${word}: ${definition}. ${result.contextualResonance}`;
  }

  return `${word}: ${definition}`;
}

export default function VoiceLayer({
  mode,
  bookContext,
  micMode: micModeOverride,
  sessionMinutes: sessionMinutesOverride,
  onResult,
  onQuery,
}: VoiceLayerProps) {
  const [settings] = useVoiceSettings();
  const micMode = micModeOverride ?? settings.micMode;
  const sessionMinutes = sessionMinutesOverride ?? settings.sessionMinutes;
  const { speed, voice, speakWordFirst } = settings;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const modeRef = useRef(mode);
  const micModeRef = useRef(micMode);
  const bookContextRef = useRef(bookContext);
  const speakWordFirstRef = useRef(speakWordFirst);
  const onResultRef = useRef(onResult);
  const onQueryRef = useRef(onQuery);
  const sttStopRef = useRef<() => void>(() => {});
  const lastPingAtRef = useRef(0);

  const pingFeedback = useCallback(() => {
    const now = Date.now();
    if (now - lastPingAtRef.current < 280) return;
    lastPingAtRef.current = now;
    playPing();
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    micModeRef.current = micMode;
  }, [micMode]);

  useEffect(() => {
    bookContextRef.current = bookContext;
  }, [bookContext]);

  useEffect(() => {
    speakWordFirstRef.current = speakWordFirst;
  }, [speakWordFirst]);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onQueryRef.current = onQuery;
  }, [onQuery]);

  const tts = useTTS({ speed, voice });

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const stopIfPushMode = () => {
        if (micModeRef.current === "push") {
          sttStopRef.current();
        }
      };

      try {
        const word = extractTargetWord(transcript);
        if (!word) return;

        const currentMode = modeRef.current;
        const ctx = bookContextRef.current;

        if (currentMode === "feel-it" && !ctx?.bookName) {
          setErrorMessage("Book context required for feel-it mode.");
          setStatus("error");
          return;
        }

        fetchingRef.current = true;
        setStatus("fetching");
        setErrorMessage(null);
        pingFeedback();

        const body: Record<string, unknown> = { word, mode: currentMode };
        if (currentMode === "feel-it" && ctx) {
          body.bookContext = ctx;
        }

        const res = await fetch(apiUrl("/api/lookup"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Lookup failed.",
          );
        }

        const data = (await res.json()) as LookupResult;
        onQueryRef.current?.(data.word);
        onResultRef.current?.(data);

        const speakText = buildSpeakText(
          data.word,
          data.definition,
          data,
          currentMode,
          speakWordFirstRef.current,
        );

        await tts.speak(speakText);
        fetchingRef.current = false;
      } catch (err) {
        fetchingRef.current = false;
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setStatus("error");
      } finally {
        stopIfPushMode();
      }
    },
    [tts, pingFeedback],
  );

  const stt = useDeepgramSTT({
    onFinal: handleTranscript,
    onListening: pingFeedback,
  });
  sttStopRef.current = stt.stop;

  useEffect(() => {
    const micError = errorMessage ?? stt.error;

    if (micError) {
      if (stt.error && stt.error !== errorMessage) {
        setErrorMessage(stt.error);
      }
      setStatus("error");
      return;
    }

    if (tts.isSpeaking) {
      setStatus("speaking");
      return;
    }

    if (fetchingRef.current) {
      setStatus("fetching");
      return;
    }

    if (stt.isListening) {
      setStatus("listening");
      return;
    }

    setStatus("idle");
  }, [errorMessage, stt.isListening, stt.error, tts.isSpeaking]);

  useEffect(() => {
    if (tts.error) {
      console.warn("[VoiceLayer] TTS failed (text still shown):", tts.error);
    }
  }, [tts.error]);

  const micError = errorMessage ?? stt.error;

  const handleMicStart = () => {
    setErrorMessage(null);
    tts.unlockAudio();
    void stt.start();
  };

  const handleMicStop = () => {
    stt.stop();
  };

  const showStatusCard =
    status === "listening" ||
    status === "fetching" ||
    (status === "error" && !!micError);

  return (
    <div className="voice-layer">
      <MicButton
        mode={micMode}
        sessionMinutes={sessionMinutes}
        isListening={stt.isListening}
        isFetching={status === "fetching"}
        isSpeaking={tts.isSpeaking}
        onStart={handleMicStart}
        onStop={handleMicStop}
        error={micError}
      />

      {showStatusCard && (
        <div
          className={[
            "voice-layer-status glass-result",
            `voice-layer-status--${status}`,
          ].join(" ")}
          aria-live="polite"
          aria-busy={status === "fetching"}
          role={status === "error" ? "alert" : undefined}
        >
          {status === "fetching" && (
            <span
              className="voice-layer-status-spinner"
              aria-hidden="true"
            />
          )}
          <span className="voice-layer-status-text">
            {status === "listening"
              ? "Listening…"
              : status === "fetching"
                ? "Looking up…"
                : micError}
          </span>
        </div>
      )}
    </div>
  );
}
