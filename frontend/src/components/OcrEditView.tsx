import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, RotateCcw, Sparkles, ArrowRight } from 'lucide-react';

interface OcrEditViewProps {
  value: string;
  confidence: number | null;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onRestart: () => void;
  analyzing?: boolean;
}

export function OcrEditView({ value, confidence, onChange, onAnalyze, onRestart, analyzing = false }: OcrEditViewProps) {
  const hasValidText = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
      <motion.button className="text-sm text-stone-500 hover:text-amber-600 transition-colors self-start" onClick={onRestart}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: -2 }}>← Back</motion.button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <motion.h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'var(--font-heading)' }}>Verify Ingredients</motion.h2>
        <p className="mt-1 text-sm text-stone-500">Correct anything the OCR misread, then analyze.</p>
      </motion.div>

      {confidence !== null && (
        <motion.div className="flex items-center gap-2.5 rounded-xl border border-stone-200/50 bg-white/80 px-4 py-3"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {confidence >= 0.7
            ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            : <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />}
          <span className="text-sm text-stone-600">
            OCR confidence <span className="font-semibold text-stone-800">{Math.round(confidence * 100)}%</span>
            {confidence < 0.7 && <span className="text-amber-600"> — please review carefully</span>}
          </span>
        </motion.div>
      )}

      <motion.div className="relative group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-400/0 via-amber-400/0 to-amber-400/0 group-focus-within:from-amber-400/20 group-focus-within:via-amber-400/10 group-focus-within:to-amber-400/20 opacity-0 group-focus-within:opacity-100 blur transition-all duration-500" />
        <textarea
          className="relative w-full min-h-[200px] resize-y rounded-xl border border-stone-200/50 bg-white p-4 font-mono text-[0.95rem] leading-relaxed text-stone-800 outline-none transition-all focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 placeholder:text-stone-300"
          value={value} rows={10} spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste or edit ingredient text..." />
      </motion.div>

      <motion.div className="flex flex-col gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <motion.button
          className="relative flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 overflow-hidden"
          onClick={onAnalyze} disabled={!hasValidText || analyzing}
          whileHover={hasValidText && !analyzing ? { scale: 1.01 } : {}}
          whileTap={hasValidText && !analyzing ? { scale: 0.98 } : {}}>
          {analyzing ? (
            <><motion.div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> Analyzing...</>
          ) : (
            <><Sparkles className="h-5 w-5" /> Analyze Ingredients <ArrowRight className="h-4 w-4" /></>
          )}
        </motion.button>
        <motion.button
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200/50 bg-white/60 px-6 py-3 text-sm font-medium text-stone-500 transition-all hover:bg-white"
          onClick={onRestart} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <RotateCcw className="h-4 w-4" /> Scan another label
        </motion.button>
      </motion.div>
    </div>
  );
}
