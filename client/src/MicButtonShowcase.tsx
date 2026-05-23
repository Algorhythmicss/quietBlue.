import type { ReactNode } from "react";
import MicButton from "./components/MicButton";

const noop = () => {
  console.log("[MicButtonShowcase] onStart");
};

const noopStop = () => {
  console.log("[MicButtonShowcase] onStop");
};

interface StateCardProps {
  label: string;
  description: string;
  children: ReactNode;
}

function StateCard({ label, description, children }: StateCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "32px 24px",
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
        minWidth: 180,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#333",
            marginBottom: 4,
          }}
        >
          {label}
        </h2>
        <p style={{ fontSize: "0.75rem", color: "#666", lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function MicButtonShowcase() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "linear-gradient(160deg, #dce8f0 0%, #e8eef4 40%, #d4dfe8 100%)",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 48 }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.75rem",
            fontWeight: 500,
            color: "#222",
            marginBottom: 8,
          }}
        >
          MicButton Visual Test
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#555" }}>
          Temporary isolation page — all states side by side
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <StateCard
          label="Idle"
          description="isListening=false, isSpeaking=false"
        >
          <MicButton
            mode="push"
            isListening={false}
            isSpeaking={false}
            onStart={noop}
            onStop={noopStop}
          />
        </StateCard>

        <StateCard label="Listening" description="isListening=true">
          <MicButton
            mode="push"
            isListening={true}
            isSpeaking={false}
            onStart={noop}
            onStop={noopStop}
          />
        </StateCard>

        <StateCard label="Speaking" description="isSpeaking=true">
          <MicButton
            mode="push"
            isListening={false}
            isSpeaking={true}
            onStart={noop}
            onStop={noopStop}
          />
        </StateCard>

        <StateCard
          label="Error"
          description='error="Microphone access denied"'
        >
          <MicButton
            mode="push"
            isListening={false}
            isSpeaking={false}
            error="Microphone access denied"
            onStart={noop}
            onStop={noopStop}
          />
        </StateCard>

        <StateCard
          label="Session"
          description='mode="session", isListening=true, sessionMinutes=25'
        >
          <MicButton
            mode="session"
            sessionMinutes={25}
            isListening={true}
            isSpeaking={false}
            onStart={noop}
            onStop={noopStop}
          />
        </StateCard>
      </div>
    </div>
  );
}
