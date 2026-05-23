import { useState, useEffect, useRef } from "react";

interface MicButtonProps {
  mode: "push" | "session";
  sessionMinutes?: number;
  isListening: boolean;
  isFetching?: boolean;
  isSpeaking: boolean;
  onStart: () => void;
  onStop: () => void;
  error?: string | null;
}

function MicIcon() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 0 1-14 0v-2"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 23h8" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9.34V5a3 3 0 0 0-5.68-1.33"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.95 16.95A7 7 0 0 1 5 12v-2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 0 1-.11 1.23"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l20 20" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16h.01" />
    </svg>
  );
}

function Equalizer() {
  return (
    <div className="mic-equalizer" aria-hidden="true">
      <span className="mic-equalizer-bar" />
      <span className="mic-equalizer-bar" />
      <span className="mic-equalizer-bar" />
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Spinner() {
  return <span className="mic-spinner" aria-hidden="true" />;
}

export default function MicButton({
  mode,
  sessionMinutes = 5,
  isListening,
  isFetching = false,
  isSpeaking,
  onStart,
  onStop,
  error,
}: MicButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(sessionMinutes * 60);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    if (!isListening) {
      setSecondsLeft(sessionMinutes * 60);
      return;
    }

    if (mode !== "session") return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onStopRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [mode, isListening, sessionMinutes]);

  const showError = !!error;
  const showSpeaking = isSpeaking && !showError;
  const showFetching = isFetching && !showSpeaking && !showError;
  const showListening =
    isListening && !showFetching && !showSpeaking && !showError;

  const handleClick = () => {
    if (showError) {
      onStart();
      return;
    }
    if (showSpeaking || showFetching) {
      return;
    }
    if (showListening) {
      onStop();
      return;
    }
    onStart();
  };

  const ariaLabel = showError
    ? "Retry microphone"
    : showSpeaking
      ? "Speaking"
      : showFetching
        ? "Looking up"
        : showListening
          ? hovered
            ? "Stop listening"
            : "Listening"
          : "Start listening";

  const stateLabel = showError
    ? "Error"
    : showSpeaking
      ? "Speaking…"
      : showFetching
        ? "Processing…"
        : showListening
          ? "Listening…"
          : null;

  return (
    <div className="mic-button-wrapper">
      {mode === "session" && showListening && (
        <div className="mic-session-pill">{formatTime(secondsLeft)}</div>
      )}

      {stateLabel && (
        <span
          className={[
            "mic-state-label",
            showError && "mic-state-label--error",
            showSpeaking && "mic-state-label--speaking",
            showFetching && "mic-state-label--fetching",
            showListening && "mic-state-label--listening",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {stateLabel}
        </span>
      )}

      <div className="mic-button-container">
        {(showListening || showFetching) && (
          <span
            className={[
              "mic-pulse-ring",
              showFetching && "mic-pulse-ring--fetching",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          className={[
            "mic-button",
            showError && "mic-button--error",
            showSpeaking && "mic-button--speaking",
            showFetching && "mic-button--fetching",
            showListening && "mic-button--listening",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label={ariaLabel}
          title={showError ? (error ?? "Error") : undefined}
        >
          {showError && <AlertCircleIcon />}
          {showFetching && <Spinner />}
          {showSpeaking && <Equalizer />}
          {!showError && !showFetching && !showSpeaking && (
            showListening && hovered ? <MicOffIcon /> : <MicIcon />
          )}
        </button>
      </div>
    </div>
  );
}
