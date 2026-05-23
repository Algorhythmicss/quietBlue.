import { useEffect, useState, useCallback } from "react";

export interface VoiceSettings {
  micMode: "push" | "session";
  sessionMinutes: number;
  speed: number;
  voice: "meera" | "fable";
  speakWordFirst: boolean;
}

export const VOICE_SETTINGS_STORAGE_KEY = "quietblue-voice-settings";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  micMode: "push",
  sessionMinutes: 30,
  speed: 1.1,
  voice: "meera",
  speakWordFirst: true,
};

const SESSION_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
] as const;

export function normalizeVoiceSettings(
  partial: Partial<VoiceSettings>,
): VoiceSettings {
  return {
    micMode: partial.micMode === "session" ? "session" : "push",
    sessionMinutes:
      typeof partial.sessionMinutes === "number" && partial.sessionMinutes > 0
        ? Math.round(partial.sessionMinutes)
        : DEFAULT_VOICE_SETTINGS.sessionMinutes,
    speed:
      typeof partial.speed === "number"
        ? Math.min(1.3, Math.max(0.8, Math.round(partial.speed * 10) / 10))
        : DEFAULT_VOICE_SETTINGS.speed,
    voice:
      partial.voice === "fable" || partial.voice === "nova" ? "fable" : "meera",
    speakWordFirst: partial.speakWordFirst !== false,
  };
}

export function readVoiceSettings(
  storage: Pick<Storage, "getItem"> = localStorage,
): VoiceSettings {
  try {
    const raw = storage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return normalizeVoiceSettings(JSON.parse(raw) as Partial<VoiceSettings>);
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function writeVoiceSettings(
  next: VoiceSettings,
  storage: Pick<Storage, "setItem"> = localStorage,
): VoiceSettings {
  const normalized = normalizeVoiceSettings(next);
  try {
    storage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore quota / private mode errors
  }
  return normalized;
}

export function useVoiceSettings(): [VoiceSettings, (s: VoiceSettings) => void] {
  const [settings, setSettingsState] = useState<VoiceSettings>(readVoiceSettings);

  const setSettings = useCallback((next: VoiceSettings) => {
    setSettingsState(writeVoiceSettings(next));
  }, []);

  return [settings, setSettings];
}

interface SessionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

export function SettingsIconButton({
  onClick,
  "aria-label": ariaLabel = "Voice settings",
}: {
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      className="settings-icon-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <SettingsIcon />
    </button>
  );
}

function patchSettings(
  settings: VoiceSettings,
  patch: Partial<VoiceSettings>,
): VoiceSettings {
  return normalizeVoiceSettings({ ...settings, ...patch });
}

export default function SessionSettings({
  isOpen,
  onClose,
  settings,
  onChange,
}: SessionSettingsProps) {
  const [customMinutes, setCustomMinutes] = useState(
    String(settings.sessionMinutes),
  );

  useEffect(() => {
    setCustomMinutes(String(settings.sessionMinutes));
  }, [settings.sessionMinutes]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPreset = SESSION_PRESETS.some(
    (p) => p.minutes === settings.sessionMinutes,
  );

  const handleCustomMinutesChange = (value: string) => {
    setCustomMinutes(value);
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onChange(patchSettings(settings, { sessionMinutes: parsed }));
    }
  };

  return (
    <div className="session-settings-root" role="presentation">
      <button
        type="button"
        className="session-settings-backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />

      <aside
        className="session-settings-drawer glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-settings-title"
      >
        <div className="session-settings-handle" aria-hidden="true" />

        <header className="session-settings-header">
          <h2 id="session-settings-title" className="session-settings-title">
            Voice settings
          </h2>
          <button
            type="button"
            className="session-settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <div className="session-settings-body">
          <section className="session-settings-section">
            <h3 className="session-settings-label">Mic mode</h3>
            <div className="session-settings-radio-row">
              <button
                type="button"
                className={[
                  "session-settings-radio-card",
                  settings.micMode === "push" && "session-settings-radio-card--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onChange(patchSettings(settings, { micMode: "push" }))
                }
                aria-pressed={settings.micMode === "push"}
              >
                <span className="session-settings-radio-title">Push to talk</span>
                <span className="session-settings-radio-desc">
                  Click the mic to start listening, click again to stop
                </span>
              </button>

              <button
                type="button"
                className={[
                  "session-settings-radio-card",
                  settings.micMode === "session" &&
                    "session-settings-radio-card--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onChange(patchSettings(settings, { micMode: "session" }))
                }
                aria-pressed={settings.micMode === "session"}
              >
                <span className="session-settings-radio-title">Session</span>
                <span className="session-settings-radio-desc">
                  Stay open for a set duration
                </span>
              </button>
            </div>

            {settings.micMode === "session" && (
              <div className="session-settings-duration">
                <div className="session-settings-chips">
                  {SESSION_PRESETS.map(({ label, minutes }) => (
                    <button
                      key={minutes}
                      type="button"
                      className={[
                        "session-settings-chip",
                        settings.sessionMinutes === minutes &&
                          "session-settings-chip--active",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        onChange(
                          patchSettings(settings, { sessionMinutes: minutes }),
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="session-settings-custom">
                  <span className="session-settings-custom-label">Custom</span>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={customMinutes}
                    onChange={(e) => handleCustomMinutesChange(e.target.value)}
                    className={[
                      "session-settings-custom-input input-ghost",
                      !isPreset && "session-settings-custom-input--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <span className="session-settings-custom-suffix">min</span>
                </label>
              </div>
            )}
          </section>

          <section className="session-settings-section">
            <h3 className="session-settings-label">Voice</h3>

            <div className="session-settings-field">
              <div className="session-settings-field-row">
                <span className="session-settings-field-label">Speed</span>
                <span className="session-settings-field-value">
                  {settings.speed.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.1}
                value={settings.speed}
                onChange={(e) =>
                  onChange(
                    patchSettings(settings, {
                      speed: parseFloat(e.target.value),
                    }),
                  )
                }
                className="session-settings-slider"
                aria-label="Speech speed"
              />
              <div className="session-settings-slider-ticks">
                <span>0.8</span>
                <span>1.3</span>
              </div>
            </div>

            <div className="session-settings-field">
              <span className="session-settings-field-label">Voice</span>
              <div className="session-settings-pills">
                {(["meera", "fable"] as const).map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    className={[
                      "session-settings-pill",
                      settings.voice === voice && "session-settings-pill--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onChange(patchSettings(settings, { voice }))}
                    aria-pressed={settings.voice === voice}
                  >
                    {voice === "meera" ? "Meera" : "Fable (English)"}
                  </button>
                ))}
              </div>
            </div>

            <label className="session-settings-toggle-row">
              <div className="session-settings-toggle-copy">
                <span className="session-settings-toggle-title">
                  Speak word first
                </span>
                <span className="session-settings-toggle-desc">
                  Say the word before its definition
                </span>
              </div>
              <button
                type="button"
                role="switch"
                className={[
                  "session-settings-toggle",
                  settings.speakWordFirst && "session-settings-toggle--on",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-checked={settings.speakWordFirst}
                onClick={() =>
                  onChange(
                    patchSettings(settings, {
                      speakWordFirst: !settings.speakWordFirst,
                    }),
                  )
                }
              >
                <span className="session-settings-toggle-knob" />
              </button>
            </label>
          </section>
        </div>
      </aside>
    </div>
  );
}
