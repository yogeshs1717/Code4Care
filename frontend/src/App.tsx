import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { analyzeIngredients } from './api/analyzeClient';
import { OcrRequestError, requestOcr } from './api/ocrClient';
import { HeroSection } from './components/HeroSection';
import { CaptureView } from './components/CaptureView';
import { HomographyCropper } from './components/HomographyCropper';
import { ScanAnimation } from './components/ScanAnimation';
import { OcrEditView } from './components/OcrEditView';
import { ReportDashboard } from './components/ReportDashboard';
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

  useEffect(() => () => abortRef.current?.abort(), []);

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
    setStage('capture');
  }, [revokePreview]);

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
    setStage('hero');
  }, [revokePreview]);

  // ── File selection from CaptureView ──
  const handleSelect = useCallback(
    (file: File) => {
      revokePreview();
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
      setStage('crop');
    },
    [revokePreview]
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

        setTimeout(() => setStage('edit'), 400);
      } catch (cause) {
        clearInterval(scanTimer);
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(
          cause instanceof OcrRequestError
            ? cause.message
            : 'OCR failed. Please try again.'
        );
        setStage('capture');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  // ── Analyze (POST /api/v1/analyze) ──
  const handleAnalyze = useCallback(async () => {
    setStage('analyzing');
    setScanProgress(0);
    setScanStatus('Analyzing ingredients...');

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 0.85) return prev;
        return prev + 0.08;
      });
    }, 400);

    try {
      const data = await analyzeIngredients(text);
      clearInterval(timer);
      setReport(data.report);
      setAiSummary(data.ai_summary ?? null);
      setScanProgress(1);
      setScanStatus('Analysis complete!');
      setTimeout(() => setStage('report'), 400);
    } catch {
      clearInterval(timer);
      setError('Analysis failed. Please check your connection and try again.');
      setStage('edit');
    }
  }, [text]);

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
          <HeroSection key="hero" onEnterApp={() => setStage('capture')} />
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
              <HomographyCropper
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
            className=""
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReportDashboard
              report={report}
              aiSummary={aiSummary}
              onHome={goHome}
              onNewScan={reset}
            />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
