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
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HealthProfileModal } from './components/HealthProfileModal';
import { useAuth } from './auth';
import type { OcrResult } from './types/ocr';
import type { DeterministicReport } from './types/health';
import type { PersonalizationResult } from './types/auth';

type Stage =
  | 'hero'
  | 'capture'
  | 'crop'
  | 'scanning'
  | 'edit'
  | 'analyzing'
  | 'report';

const scanStatuses = [
  'Connecting to OCR service...',
  'Analyzing image...',
  'Reading label text...',
  'Extracting ingredients...',
  'Processing complete!',
];

export default function App() {
  const { token, user, initializing } = useAuth();
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
  const [personalization, setPersonalization] = useState<PersonalizationResult | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    setPersonalization(null);
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
    setPersonalization(null);
    setStage('hero');
  }, [revokePreview]);

  // ── File selection ──
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
          const idx = Math.min(Math.floor(next / 0.25), scanStatuses.length - 2);
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

  // ── Analyze ──
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
      const data = await analyzeIngredients(text, token);
      clearInterval(timer);
      setReport(data.report);
      setAiSummary(data.ai_summary ?? null);
      setPersonalization(data.personalization ?? null);
      setScanProgress(1);
      setScanStatus('Analysis complete!');
      setTimeout(() => setStage('report'), 400);
    } catch {
      clearInterval(timer);
      setError('Analysis failed. Please check your connection and try again.');
      setStage('edit');
    }
  }, [text, token]);

  // ── Skeleton UI helpers for hero/app mode ──
  const isHero = stage === 'hero';

  return (
    <div className="relative min-h-dvh bg-[#f8f5f0]">
      {/* ── Header (shown on non-hero, non-report stages — hero and report have their own) ── */}
      {!isHero && stage !== 'report' && (
        <Header
          variant="app"
          onHome={goHome}
          onNewScan={reset}
          onSignIn={() => setAuthOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
      )}

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="fixed left-0 right-0 top-0 z-50 px-4 pt-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 shadow-lg backdrop-blur-sm"
              role="alert"
            >
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage switcher ── */}
      <AnimatePresence mode="wait">
        {/* HERO — full page with its own header/footer */}
        {stage === 'hero' && (
          <HeroSection
            key="hero"
            onEnterApp={() => setStage('capture')}
            onSignIn={() => setAuthOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
          />
        )}

        {/* CAPTURE */}
        {stage === 'capture' && (
          <motion.main
            key="capture"
            className="mx-auto max-w-md pt-20 min-h-dvh"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CaptureView onSelect={handleSelect} onInvalid={setError} onBack={goHome} />
          </motion.main>
        )}

        {/* CROP */}
        {stage === 'crop' && previewUrl && (
          <motion.main
            key="crop"
            className="mx-auto max-w-md pt-20 min-h-dvh"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
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
            className="mx-auto max-w-md pt-24 min-h-dvh flex items-center justify-center"
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
            className="mx-auto max-w-md pt-20 min-h-dvh flex flex-col justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
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
            className="mx-auto max-w-md pt-24 min-h-dvh flex items-center justify-center"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReportDashboard
              report={report}
              aiSummary={aiSummary}
              personalization={personalization}
              onHome={goHome}
              onNewScan={reset}
              onOpenProfile={() => setProfileOpen(true)}
            />
          </motion.main>
        )}
      </AnimatePresence>

      {/* ── Footer (shown on non-hero stages) ── */}
      {!isHero && stage !== 'report' && (
        <Footer onHome={goHome} onNewScan={reset} />
      )}

      {/* ── Auth + profile modals ── */}
      {!initializing && (
        <AnimatePresence>
          {authOpen && (
            <AuthModal
              open={authOpen}
              onClose={() => setAuthOpen(false)}
              contextLabel={
                user
                  ? `Signed in as ${user.email}`
                  : 'Set your health priorities and get personal verdicts'
              }
            />
          )}
        </AnimatePresence>
      )}
      <AnimatePresence>
        {profileOpen && <HealthProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
