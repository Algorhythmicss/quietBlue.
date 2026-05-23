import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import VoiceLayer from "../components/VoiceLayer";
import WelcomeCard from "../components/WelcomeCard";
import SessionSettings, {
  useVoiceSettings,
  SettingsIconButton,
} from "../components/SessionSettings";
import {
  isFeelItResult,
  type LookupResult as Result,
} from "../types/lookup";

type Mode = "quick" | "simple" | "feel-it";

interface BookContext {
  bookName: string;
  description: string;
}

const MODE_TOOLTIPS: Record<Mode, string> = {
  quick: "Instant — the sharpest definition in a few words",
  simple: "A fuller explanation, crafted to be understood",
  "feel-it":
    "Meaning through the lens of your book — lock it once, use it always",
};

// Change this to your backend URL if deploying separately
// e.g. "https://your-backend.railway.app"
const API_BASE = "";

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("quick");
  const [lockedMode, setLockedMode] = useState<Mode | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Mode | null>(null);
  const [bookContext, setBookContext] = useState<BookContext | null>(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [bookDraft, setBookDraft] = useState({ bookName: "", description: "" });
  const [hoverMode, setHoverMode] = useState<Mode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useVoiceSettings();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const modeContainerRef = useRef<HTMLDivElement>(null);
  const modeButtonRefs = useRef<Partial<Record<Mode, HTMLButtonElement>>>({});
  const previousModeRef = useRef<Mode>("quick");

  const activeMode = lockedMode ?? mode;
  const indicatorMode = hoverMode ?? activeMode;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const btn = modeButtonRefs.current[indicatorMode];
    const container = modeContainerRef.current;
    if (!btn || !container) return;

    const updateIndicator = () => {
      const button = modeButtonRefs.current[indicatorMode];
      const modeContainer = modeContainerRef.current;
      if (!button || !modeContainer) return;

      const containerRect = modeContainer.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [indicatorMode, lockedMode, mode]);

  const handleModeSelect = (m: Mode) => {
    if (m === "feel-it") {
      if (lockedMode === "feel-it") {
        setLockedMode(null);
        setMode("quick");
        return;
      }
      previousModeRef.current = mode;
      setLockedMode("feel-it");
      if (!bookContext) {
        setShowBookDialog(true);
      }
    } else {
      setLockedMode(null);
      setMode(m);
    }
  };

  const handleBookSubmit = () => {
    if (!bookDraft.bookName.trim()) return;
    setBookContext({
      bookName: bookDraft.bookName,
      description: bookDraft.description,
    });
    setShowBookDialog(false);
  };

  const handleBookBack = () => {
    setShowBookDialog(false);
    if (!bookContext) {
      setLockedMode(null);
      setMode(previousModeRef.current);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (activeMode === "feel-it" && !bookContext) {
      setShowBookDialog(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        word: trimmed,
        mode: activeMode,
      };
      if (activeMode === "feel-it" && bookContext) {
        body.bookContext = bookContext;
      }

      const res = await fetch(`${API_BASE}/api/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error || "Something went wrong."
        );
        return;
      }

      const data = await res.json();
      setResult(data as Result);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <>
      <WelcomeCard onOpenSettings={() => setShowSettings(true)} />

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="/ocean-bg.jpg"
          alt="Ocean background"
          className="bg-ocean"
        />
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.10)" }}
        />
      </div>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center"
        style={{ padding: "28px 40px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            quietBlue
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#111",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginTop: "2px",
            }}
          >
            by algorhythmicass
          </span>
        </div>
        <SettingsIconButton onClick={() => setShowSettings(true)} />
      </nav>

      {/* Main */}
      <main className="relative z-10 main-content">
        <div className="main-content-inner">
          {/* Feel It context badge */}
          {lockedMode === "feel-it" && bookContext && (
            <div
              className="glass-panel fade-slide-up"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 18px",
                borderRadius: "9999px",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#555"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                {bookContext.bookName}
              </span>
              {bookContext.description && (
                <>
                  <span
                    style={{
                      width: "1px",
                      height: "12px",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontStyle: "italic",
                      color: "#666",
                      maxWidth: "160px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {bookContext.description}
                  </span>
                </>
              )}
              <button
                onClick={() => setShowBookDialog(true)}
                style={{
                  marginLeft: "4px",
                  color: "#aaa",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Edit context"
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Search input */}
          <div style={{ width: "100%", position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a word or phrase"
              className="input-ghost input-search"
              style={{
                width: "100%",
                borderRadius: "9999px",
                padding: "16px 56px 16px 28px",
                fontSize: "1.25rem",
                fontWeight: 300,
                letterSpacing: "-0.01em",
                textAlign: "center",
                color: "#1a1a1a",
              }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !query.trim()}
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: query.trim() ? "#444" : "#bbb",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
            >
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </div>

          {/* Mode selector */}
          <div
            ref={modeContainerRef}
            className="glass-panel mode-selector"
            onMouseLeave={() => {
              setHoverMode(null);
              setTooltip(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px",
              borderRadius: "9999px",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div
              className="mode-indicator"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />
            {(["quick", "simple", "feel-it"] as Mode[]).map((m) => {
              const isActive = activeMode === m;
              const isLocked = lockedMode === m;
              return (
                <div key={m} style={{ position: "relative", zIndex: 1 }}>
                  <button
                    ref={(el) => {
                      modeButtonRefs.current[m] = el;
                    }}
                    onClick={() => handleModeSelect(m)}
                    onMouseEnter={() => {
                      setHoverMode(m);
                      setTooltip(m);
                    }}
                    style={{
                      position: "relative",
                      padding: "8px 20px",
                      borderRadius: "9999px",
                      fontSize: "0.875rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#111" : "#666",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "color 0.2s, font-weight 0.2s",
                    }}
                  >
                    {isLocked && (
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "6px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#333",
                        }}
                      />
                    )}
                    {m === "feel-it"
                      ? "Feel It"
                      : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>

                  {/* Tooltip */}
                  {tooltip === m && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 50,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        className="glass-panel"
                        style={{
                          border: "1px solid rgba(255,255,255,0.4)",
                          borderRadius: "12px",
                          padding: "8px 14px",
                          fontSize: "0.75rem",
                          color: "#555",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                        }}
                      >
                        {MODE_TOOLTIPS[m]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div
              className="glass-result fade-slide-up"
              style={{
                width: "100%",
                borderRadius: "24px",
                padding: "32px",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="shimmer" style={{ height: "28px", width: "120px" }} />
                <div className="shimmer" style={{ height: "16px", width: "100%" }} />
                <div className="shimmer" style={{ height: "16px", width: "80%" }} />
                <div className="shimmer" style={{ height: "16px", width: "60%" }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div
              className="glass-result fade-slide-up"
              style={{
                width: "100%",
                borderRadius: "24px",
                padding: "24px 32px",
                border: "1px solid rgba(255,255,255,0.4)",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "#888" }}>{error}</p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div
              className="glass-result fade-slide-up"
              style={{
                width: "100%",
                borderRadius: "24px",
                padding: "32px",
                border: "1px solid rgba(255,255,255,0.4)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.875rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#111",
                  }}
                >
                  {result.word}
                </h2>
                {result.partOfSpeech && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#aaa",
                      fontWeight: 600,
                      marginTop: "8px",
                    }}
                  >
                    {result.partOfSpeech}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "#444",
                  fontWeight: 300,
                }}
              >
                {result.definition}
              </p>

              {"example" in result && result.example && (
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontStyle: "italic",
                    color: "#888",
                    lineHeight: 1.6,
                    borderLeft: "2px solid rgba(0,0,0,0.12)",
                    paddingLeft: "16px",
                  }}
                >
                  "{result.example}"
                </p>
              )}

              {isFeelItResult(result) && result.contextualResonance && (
                <div
                  style={{
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: "#bbb" }}
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#bbb",
                      }}
                    >
                      Contextual Resonance
                    </span>
                  </div>
                  <blockquote
                    style={{
                      fontSize: "0.875rem",
                      fontStyle: "italic",
                      lineHeight: 1.7,
                      color: "#666",
                      borderLeft: "2px solid rgba(0,0,0,0.10)",
                      paddingLeft: "16px",
                    }}
                  >
                    {result.contextualResonance}
                  </blockquote>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="voice-panel">
        <VoiceLayer
          mode={activeMode}
          bookContext={bookContext ?? undefined}
          micMode={voiceSettings.micMode}
          sessionMinutes={voiceSettings.sessionMinutes}
          onQuery={setQuery}
          onResult={(data) => {
            setError(null);
            setResult(data);
          }}
        />
      </div>

      <SessionSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={voiceSettings}
        onChange={setVoiceSettings}
      />

      {/* Book context dialog */}
      {showBookDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.2)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => {
              if (bookContext) setShowBookDialog(false);
            }}
          />
          <div
            className="glass-panel fade-slide-up"
            style={{
              position: "relative",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "24px",
              padding: "32px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#111",
                marginBottom: "6px",
              }}
            >
              Set your reading context
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#888",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              Lock in your book once. Every word will be explained through its
              world.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                autoFocus
                type="text"
                value={bookDraft.bookName}
                onChange={(e) =>
                  setBookDraft((p) => ({ ...p, bookName: e.target.value }))
                }
                placeholder="Book name..."
                className="input-ghost"
                style={{
                  width: "100%",
                  borderRadius: "9999px",
                  padding: "12px 20px",
                  fontSize: "0.875rem",
                  color: "#111",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBookSubmit()}
              />
              <input
                type="text"
                value={bookDraft.description}
                onChange={(e) =>
                  setBookDraft((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="How you want it explained (optional)..."
                className="input-ghost"
                style={{
                  width: "100%",
                  borderRadius: "9999px",
                  padding: "12px 20px",
                  fontSize: "0.875rem",
                  color: "#111",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBookSubmit()}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              {!bookContext ? (
                <button
                  onClick={handleBookBack}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    color: "#666",
                    background: "none",
                    border: "1px solid rgba(0,0,0,0.12)",
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={() => setShowBookDialog(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    color: "#666",
                    background: "none",
                    border: "1px solid rgba(0,0,0,0.12)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleBookSubmit}
                disabled={!bookDraft.bookName.trim()}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "9999px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "white",
                  background: bookDraft.bookName.trim() ? "#111" : "#ccc",
                  border: "none",
                  cursor: bookDraft.bookName.trim() ? "pointer" : "not-allowed",
                  transition: "background 0.2s",
                }}
              >
                Lock it in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
