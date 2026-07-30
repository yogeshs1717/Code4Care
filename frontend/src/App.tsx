import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OcrRequestError, requestOcr } from './api/ocrClient';
import { analyzeIngredients, explainReport } from './api/analyzeClient';
import { HeroSection } from './components/HeroSection';
import { CaptureView } from './components/CaptureView';
import { ImageCropper } from './components/ImageCropper';
import { ScanAnimation } from './components/ScanAnimation';
import { OcrEditView } from './components/OcrEditView';
import { HealthReportView } from './components/HealthReportView';
import { GemmaChatView } from './components/GemmaChatView';
import { Sparkles } from 'lucide-react';
import type { OcrResult } from './types/ocr';
import type { DeterministicReport } from './types/health';

type Stage =
  | 'hero'       // Cinematic 3D hero scroll
  | 'capture'    // Upload / camera
  | 'crop'       // Crop the label image
  | 'scanning'   // Animated OCR progress
  | 'edit'       // Edit OCR text + analyze
  | 'analyzing'  // Scanning animation for analysis
  | 'report'     // Health report
  | 'chat';      // Gemma chat

const scanStatuses = [
  'Connecting to OCR service...',
  'Analyzing image...',
  'Reading label text...',
  'Extracting ingredients...',
  'Processing complete!',
];

const analyzeStatuses = [
  'Resolving ingredients...',
  'Matching additives...',
  'Applying health rules...',
  'Generating report...',
  'Analysis complete!',
];

export default function App() {
  const [stage, setStage] = useState<Stage>('hero');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState(scanStatuses[0]);
  const [report, setReport] = useState<DeterministicReport | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  // ── Sync URL Hash with Stage for Mobile Hardware Back Button ──
  const changeStage = useCallback((nextStage: Stage) => {
    setStage(nextStage);
    if (typeof window !== 'undefined') {
      const hash = nextStage === 'hero' ? '' : `#${nextStage}`;
      if (window.location.hash !== hash) {
        window.history.pushState(null, '', hash || window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as Stage;
      if (hash && ['hero', 'capture', 'crop', 'edit', 'report', 'chat'].includes(hash)) {
        setStage(hash);
      } else {
        setStage('hero');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    revokePreview();
    setResult(null);
    setText('');
    setError(null);
    setBusy(false);
    setScanProgress(0);
    setScanStatus(scanStatuses[0]);
    setReport(null);
    setAiSummary(null);
    changeStage('capture');
  }, [revokePreview, changeStage]);

  const goHome = useCallback(() => {
    abortRef.current?.abort();
    revokePreview();
    setResult(null);
    setText('');
    setError(null);
    setBusy(false);
    setScanProgress(0);
    setScanStatus(scanStatuses[0]);
    setReport(null);
    setAiSummary(null);
    changeStage('hero');
  }, [revokePreview, changeStage]);

  // ── File selection from CaptureView ──
  const handleSelect = useCallback(
    (file: File) => {
      revokePreview();
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
      changeStage('crop');
    },
    [revokePreview, changeStage]
  );

  // ── OCR run ──
  const handleRunOcr = useCallback(
    async (file: File) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setError(null);
      setStage('scanning');
      setScanProgress(0);

      const scanTimer = setInterval(() => {
        setScanProgress((prev) => {
          const next = Math.min(prev + 0.08, 0.9);
          const idx = Math.min(
            Math.floor(next / 0.25),
            scanStatuses.length - 2
          );
          setScanStatus(scanStatuses[idx]);
          return next;
        });
      }, 400);

      try {
        const ocr = await requestOcr(file, controller.signal);
        clearInterval(scanTimer);
        setScanProgress(1);
        setScanStatus(scanStatuses[4]);
        setResult(ocr);
        setText(ocr.text);

        setTimeout(() => changeStage('edit'), 400);
      } catch (cause) {
        clearInterval(scanTimer);
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(
          cause instanceof OcrRequestError
            ? cause.message
            : 'OCR failed. Please try again.'
        );
        changeStage('capture');
      } finally {
        setBusy(false);
      }
    },
    [changeStage]
  );

  // ── Analyze — calls POST /api/v1/analyze ──
  const handleAnalyze = useCallback(async () => {
    changeStage('analyzing');
    setScanProgress(0);
    setScanStatus(analyzeStatuses[0]);
    setError(null);

    // Start progress animation
    const timer = setInterval(() => {
      setScanProgress((prev) => {
        const next = Math.min(prev + 0.06, 0.9);
        const idx = Math.min(
          Math.floor(next / 0.25),
          analyzeStatuses.length - 2
        );
        setScanStatus(analyzeStatuses[idx]);
        return next;
      });
    }, 400);

    try {
      const response = await analyzeIngredients(text);
      clearInterval(timer);
      setScanProgress(1);
      setScanStatus(analyzeStatuses[4]);
      setReport(response.report);

      // Fetch AI summary in the background (non-blocking)
      explainReport(text)
        .then((summary) => setAiSummary(summary))
        .catch(() => setAiSummary(null));

      setTimeout(() => changeStage('report'), 400);
    } catch (cause) {
      clearInterval(timer);
      const msg = cause instanceof Error ? cause.message : 'Analysis failed. Please try again.';
      setError(msg);
      changeStage('edit');
    }
  }, [text, changeStage]);

  return (
    <div className="relative min-h-dvh bg-[#FAFAFA]">
      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="fixed left-0 right-0 top-0 z-50 px-4 pt-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b] shadow-lg"
              role="alert"
            >
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage switcher ── */}
      <AnimatePresence mode="wait">
        {/* HERO */}
        {stage === 'hero' && (
          <HeroSection key="hero" onEnterApp={() => changeStage('capture')} />
        )}

        {/* CAPTURE */}
        {stage === 'capture' && (
          <motion.main
            key="capture"
            className="mx-auto max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pt-6 pb-2">
              <motion.button
                className="text-sm text-[#5f6368] transition-colors hover:text-[#202124]"
                onClick={goHome}
                whileHover={{ x: -2 }}
              >
                ← Back
              </motion.button>
            </div>
            <CaptureView onSelect={handleSelect} onInvalid={setError} />
          </motion.main>
        )}

        {/* CROP */}
        {stage === 'crop' && previewUrl && (
          <motion.main
            key="crop"
            className="mx-auto max-w-md"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 pt-6 pb-2">
              <motion.button
                className="text-sm text-[#5f6368] transition-colors hover:text-[#202124]"
                onClick={reset}
                whileHover={{ x: -2 }}
              >
                ← Choose another
              </motion.button>
            </div>
            <div className="px-4">
              <ImageCropper
                src={previewUrl}
                busy={busy}
                onConfirm={handleRunOcr}
                onCancel={reset}
                onError={setError}
              />
            </div>
          </motion.main>
        )}

        {/* SCANNING */}
        {stage === 'scanning' && (
          <motion.main
            key="scanning"
            className="mx-auto max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ScanAnimation progress={scanProgress} status={scanStatus} />
          </motion.main>
        )}

        {/* EDIT */}
        {stage === 'edit' && result && (
          <motion.main
            key="edit"
            className="mx-auto max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 pt-6 pb-2">
              <motion.button
                className="text-sm text-[#5f6368] transition-colors hover:text-[#202124]"
                onClick={reset}
                whileHover={{ x: -2 }}
              >
                ← Back
              </motion.button>
            </div>
            <OcrEditView
              value={text}
              confidence={result.metadata.confidence}
              onChange={setText}
              onAnalyze={handleAnalyze}
              onRestart={reset}
            />
          </motion.main>
        )}

        {/* ANALYZING */}
        {stage === 'analyzing' && (
          <motion.main
            key="analyzing"
            className="mx-auto max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ScanAnimation progress={scanProgress} status={scanStatus} />
          </motion.main>
        )}

        {/* REPORT */}
        {stage === 'report' && (
          <motion.main
            key="report"
            className="mx-auto max-w-lg pb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-4 pt-6 pb-2">
              <motion.button
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
                onClick={goHome}
                whileHover={{ x: -2 }}
              >
                ← Home
              </motion.button>
              <motion.button
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                onClick={reset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                New Scan
              </motion.button>
            </div>

            <HealthReportView
              report={report}
              aiSummary={aiSummary}
            />

            {/* Floating Chatbot FAB */}
            <motion.button
              onClick={() => changeStage('chat')}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-slate-900 border border-slate-700/60 px-4 py-3 text-xs font-bold text-white shadow-2xl shadow-slate-900/30 hover:bg-slate-800 active:scale-95 transition-all"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Ask Gemma AI</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            </motion.button>
          </motion.main>
        )}

        {/* CHAT (standalone) */}
        {stage === 'chat' && (
          <motion.main
            key="chat"
            className="mx-auto max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-4 pt-6 pb-2 border-b border-slate-200/80 mb-2">
              <motion.button
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                onClick={() => changeStage('report')}
                whileHover={{ x: -2 }}
              >
                ← Back to Health Report
              </motion.button>
              <motion.button
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={goHome}
              >
                Home
              </motion.button>
            </div>
            <GemmaChatView available={true} ingredientText={text} />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
