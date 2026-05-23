import { useCallback, useState } from "react";

const STORAGE_KEY = "quietblue-welcomed";

function BookOpenIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z"
      />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: BookOpenIcon,
    text: "open it while you read. it stays out of your way.",
  },
  {
    Icon: MicIcon,
    text: "speak a word. hear the meaning. never lose the page.",
  },
  {
    Icon: SparklesIcon,
    text: "feel it mode shapes every definition to your book's world.",
  },
] as const;

type WelcomeCardProps = {
  onOpenSettings?: () => void;
};

export default function WelcomeCard({ onOpenSettings }: WelcomeCardProps) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "1",
  );
  const [fadingOut, setFadingOut] = useState(false);

  const dismiss = useCallback(
    (afterDismiss?: () => void) => {
      if (fadingOut) return;
      setFadingOut(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore quota / private mode errors
      }
      afterDismiss?.();
      window.setTimeout(() => setVisible(false), 150);
    },
    [fadingOut],
  );

  const openSettings = useCallback(() => {
    dismiss(onOpenSettings);
  }, [dismiss, onOpenSettings]);

  if (!visible) return null;

  return (
    <div
      className={`welcome-card-root${fadingOut ? " welcome-card-root--out" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="welcome-card-backdrop"
        aria-label="Dismiss welcome"
        onClick={dismiss}
      />
      <div
        className="welcome-card"
        role="dialog"
        aria-labelledby="welcome-card-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="welcome-card-title" className="welcome-card-headline">
          a word lookup built for readers
        </h2>

        <ul className="welcome-card-features">
          {FEATURES.map(({ Icon, text }) => (
            <li key={text} className="welcome-card-feature">
              <span className="welcome-card-feature-icon">
                <Icon />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className="welcome-card-section-label">before you start</p>

        <div className="welcome-card-settings">
          <div className="welcome-card-settings-block">
            <div className="welcome-card-settings-header">
              <p className="welcome-card-settings-title">Mic modes</p>
              {onOpenSettings ? (
                <button
                  type="button"
                  className="welcome-card-settings-btn"
                  onClick={openSettings}
                >
                  configurable in settings
                </button>
              ) : null}
            </div>
            <p className="welcome-card-settings-item">
              <strong>Push to talk</strong> — tap the mic, say the word, tap
              again
            </p>
            <p className="welcome-card-settings-item">
              <strong>Session</strong> — set a timer, mic stays live your whole
              reading session
            </p>
          </div>
          <div className="welcome-card-settings-block">
            <div className="welcome-card-settings-header">
              <p className="welcome-card-settings-title">Voices</p>
              {onOpenSettings ? (
                <button
                  type="button"
                  className="welcome-card-settings-btn"
                  onClick={openSettings}
                >
                  configurable in settings
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="welcome-card-button"
          onClick={() => dismiss()}
        >
          got it, let's read
        </button>
      </div>
    </div>
  );
}
