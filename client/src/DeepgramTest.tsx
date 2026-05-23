import { useCallback, useState } from "react";
import { useDeepgramSTT } from "./hooks/useDeepgramSTT";
import { useTTS } from "./hooks/useTTS";
import { extractTargetWord } from "./lib/extractWord";

export default function DeepgramTest() {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [extractedWord, setExtractedWord] = useState<string | null>(null);

  const onFinal = useCallback((transcript: string) => {
    setFinalTranscript(transcript);
    setInterimTranscript("");
    setExtractedWord(extractTargetWord(transcript));
  }, []);

  const onInterim = useCallback((transcript: string) => {
    setInterimTranscript(transcript);
  }, []);

  const { start, stop, isListening, error } = useDeepgramSTT({
    onFinal,
    onInterim,
  });

  const tts = useTTS();

  const handleToggle = () => {
    if (isListening) {
      stop();
    } else {
      void start();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Deepgram STT Test</h1>
          <p className="mt-1 text-sm text-slate-400">
            Temporary test page for speech-to-text wiring.
          </p>
        </header>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleToggle}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
              isListening
                ? "bg-red-600 hover:bg-red-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {isListening ? "Stop mic" : "Start mic"}
          </button>
          <span className="text-sm">
            Status:{" "}
            <span
              className={
                isListening ? "font-medium text-green-400" : "text-slate-400"
              }
            >
              {isListening ? "Listening" : "Idle"}
            </span>
          </span>
        </div>

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Interim transcript
          </h2>
          <p className="min-h-[1.5rem] text-slate-300 italic">
            {interimTranscript || "—"}
          </p>
        </section>

        <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Final transcript
          </h2>
          <p className="min-h-[1.5rem] text-slate-100">
            {finalTranscript || "—"}
          </p>
        </section>

        <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Extracted word
          </h2>
          <p className="min-h-[1.5rem] font-mono text-amber-300">
            {extractedWord ?? "—"}
          </p>
        </section>

        <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <header>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              TTS Test
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Calls useTTS().speak(&quot;testing one two three&quot;)
            </p>
          </header>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void tts.speak("testing one two three")}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-emerald-500"
            >
              Test TTS
            </button>
            {tts.isSpeaking && (
              <button
                type="button"
                onClick={tts.stop}
                className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-600"
              >
                Stop
              </button>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">isSpeaking</dt>
            <dd className="font-mono text-slate-200">
              {String(tts.isSpeaking)}
            </dd>
            <dt className="text-slate-500">lastSource</dt>
            <dd className="font-mono text-slate-200">{tts.lastSource ?? "—"}</dd>
            <dt className="text-slate-500">error</dt>
            <dd className="font-mono text-red-300">{tts.error ?? "—"}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
