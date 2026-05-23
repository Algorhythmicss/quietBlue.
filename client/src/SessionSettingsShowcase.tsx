import { useState } from "react";
import SessionSettings, {
  SettingsIconButton,
  useVoiceSettings,
  VOICE_SETTINGS_STORAGE_KEY,
} from "./components/SessionSettings";
import VoiceLayer from "./components/VoiceLayer";

type VoiceMode = "quick" | "simple" | "feel-it";

export default function SessionSettingsShowcase() {
  const [settings, setSettings] = useVoiceSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("quick");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "linear-gradient(160deg, #dce8f0 0%, #e8eef4 40%, #d4dfe8 100%)",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.75rem",
            fontWeight: 500,
            color: "#222",
            marginBottom: 8,
          }}
        >
          SessionSettings Persistence Test
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#555", maxWidth: 420, margin: "0 auto" }}>
          Change settings in the drawer, refresh the page, and confirm the JSON
          below matches.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <SettingsIconButton onClick={() => setDrawerOpen(true)} />

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {(["quick", "simple", "feel-it"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setVoiceMode(m)}
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.04em",
                padding: "6px 14px",
                borderRadius: 9999,
                border: "1px solid rgba(255, 255, 255, 0.4)",
                background:
                  voiceMode === m
                    ? "rgba(100, 149, 200, 0.18)"
                    : "rgba(255, 255, 255, 0.45)",
                color: voiceMode === m ? "#3a5f8a" : "#555",
                cursor: "pointer",
              }}
            >
              {m === "feel-it" ? "Feel it" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <VoiceLayer
          mode={voiceMode}
          bookContext={
            voiceMode === "feel-it"
              ? { bookName: "Moby-Dick", description: "A vast, restless sea" }
              : undefined
          }
        />

        <div
          style={{
            width: "100%",
            padding: 20,
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            color: "#333",
            wordBreak: "break-word",
          }}
        >
          <p style={{ marginBottom: 8, fontWeight: 600, fontFamily: "inherit" }}>
            Current settings (hook state)
          </p>
          <pre style={{ margin: 0 }}>{JSON.stringify(settings, null, 2)}</pre>
        </div>

        <div
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 12,
            background: "rgba(0, 0, 0, 0.04)",
            fontSize: "0.75rem",
            color: "#666",
          }}
        >
          <strong>localStorage key:</strong>{" "}
          <code>{VOICE_SETTINGS_STORAGE_KEY}</code>
          <pre style={{ marginTop: 8, fontSize: "0.7rem", overflow: "auto" }}>
            {localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY) ?? "(empty)"}
          </pre>
        </div>
      </div>

      <SessionSettings
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </div>
  );
}
