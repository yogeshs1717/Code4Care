import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

interface OcrEditViewProps {
  value: string;
  confidence: number | null;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onRestart: () => void;
  analyzing?: boolean;
}

export function OcrEditView({
  value,
  confidence,
  onChange,
  onAnalyze,
  onRestart,
  analyzing = false,
}: OcrEditViewProps) {
  const hasValidText = value.trim().length > 0;

  return (
    <motion.div
      className="flex flex-col gap-5 px-4 pt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header ── */}
      <motion.h2
        className="text-2xl font-bold text-[#202124]"
        style={{ fontFamily: 'var(--font-heading)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Verify Ingredients
      </motion.h2>

      {/* ── Confidence Badge ── */}
      {confidence !== null && (
        <motion.div
          className="flex items-center gap-2 rounded-xl bg-[#ecfdf5] px-4 py-3 text-sm text-[#065f46]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {confidence >= 0.7 ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-[#34A853]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-[#fbbc04]" />
          )}
          <span>
            OCR confidence{' '}
            <span className="font-semibold">{Math.round(confidence * 100)}%</span>
            {confidence < 0.7 && ' — please review carefully'}
          </span>
        </motion.div>
      )}

      {/* ── Info message ── */}
      <motion.p
        className="text-sm text-[#5f6368]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Correct anything the OCR misread, then analyze your ingredients.
      </motion.p>

      {/* ── Text Editor ── */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <textarea
          className="min-h-[200px] w-full resize-y rounded-xl border border-[#e8eaed] bg-white p-4 font-mono text-[0.95rem] leading-relaxed text-[#202124] outline-none transition-all focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20"
          value={value}
          rows={10}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste or edit ingredient text..."
        />
      </motion.div>

      {/* ── Action Buttons ── */}
      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          className="flex items-center justify-center gap-2 rounded-xl bg-[#4285F4] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#4285F4]/25 transition-all disabled:opacity-40"
          onClick={onAnalyze}
          disabled={!hasValidText || analyzing}
          whileHover={hasValidText && !analyzing ? { scale: 1.02 } : {}}
          whileTap={hasValidText && !analyzing ? { scale: 0.98 } : {}}
        >
          {analyzing ? (
            <>
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Analyzing...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Analyze Ingredients
            </>
          )}
        </motion.button>

        <motion.button
          className="flex items-center justify-center gap-2 rounded-xl border border-[#e8eaed] bg-white px-6 py-3 text-sm font-medium text-[#5f6368] transition-all hover:border-[#d0d2d4]"
          onClick={onRestart}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <RotateCcw className="h-4 w-4" />
          Scan another label
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
