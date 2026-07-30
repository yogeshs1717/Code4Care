import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Leaf, Sparkles } from 'lucide-react';
import type { DeterministicReport } from '../types/health';
import { IngredientBadgeGrid } from './IngredientBadgeGrid';

interface HealthReportViewProps {
  /** Deterministic report from the backend — null when not yet analyzed */
  report: DeterministicReport | null;
  /** AI summary from Gemma (optional) */
  aiSummary?: string | null;
}

export function HealthReportView({ report, aiSummary }: HealthReportViewProps) {
  if (report === null) {
    return <DemoReport />;
  }
  return <RealReport report={report} aiSummary={aiSummary} />;
}

// ── Scroll-triggered section reveal ─────────────────────────────────────────

function SectionReveal({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className="flex flex-col gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5f6368]">
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

// ── Real Report ──────────────────────────────────────────────────────────────

function RealReport({
  report,
  aiSummary,
}: {
  report: DeterministicReport;
  aiSummary?: string | null;
}) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - report.health_score.score / 100);

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-8">
      <motion.h2
        className="text-2xl font-bold text-[#202124]"
        style={{ fontFamily: 'var(--font-heading)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Your Health Report
      </motion.h2>

      {/* ── AI Summary ── */}
      {aiSummary && (
        <SectionReveal title="AI Summary" delay={0.05}>
          <div className="rounded-xl border border-[#e8eaed] bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#4285F4]" />
              <span className="text-xs font-medium text-[#4285F4]">Gemma AI</span>
            </div>
            {aiSummary.split('\n').map((line, i) => (
              <p
                key={i}
                className={`text-sm leading-relaxed text-[#202124] ${i > 0 ? 'mt-2' : ''}`}
              >
                {line}
              </p>
            ))}
          </div>
        </SectionReveal>
      )}

      {/* ── Health Score ── */}
      <SectionReveal title="Health Score" delay={0.1}>
        <div className="flex items-center gap-5 rounded-2xl border border-[#e8eaed] bg-white p-4">
          {/* Circular gauge */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e8eaed" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={report.health_score.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span
                className="text-2xl font-bold leading-none"
                style={{ color: report.health_score.color }}
              >
                {report.health_score.score}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-[#5f6368]">
                / 100
              </span>
            </div>
          </div>
          {/* Label + description */}
          <div>
            <p className="text-base font-bold" style={{ color: report.health_score.color }}>
              {report.health_score.label}
            </p>
            <p className="mt-1 text-xs text-[#5f6368]">
              Deterministic score · Higher is healthier
            </p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-[#5f6368]">
              <ShieldCheck className="h-3 w-3 text-[#34A853]" />
              Rule-engine result — not AI-generated
            </div>
          </div>
        </div>
      </SectionReveal>

      {/* ── Processing Level ── */}
      <SectionReveal title="Processing Level" delay={0.15}>
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            report.processing_level.label === 'Ultra-processed'
              ? 'border-rose-200 bg-rose-50'
              : report.processing_level.label === 'Processed'
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <Leaf
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              report.processing_level.label === 'Ultra-processed'
                ? 'text-rose-500'
                : report.processing_level.label === 'Processed'
                ? 'text-amber-500'
                : 'text-emerald-500'
            }`}
          />
          <div>
            <p className="text-sm font-semibold text-[#202124]">
              {report.processing_level.label}
            </p>
            <p className="mt-0.5 text-xs text-[#5f6368]">
              {report.processing_level.description}
            </p>
          </div>
        </div>
      </SectionReveal>

      {/* ── Ingredient Badge Grid ── */}
      {(report.positive_ingredients.length > 0 ||
        report.ingredients_of_concern.length > 0 ||
        (report.gemma_resolved_ingredients ?? []).length > 0) && (
        <SectionReveal title="Ingredients" delay={0.2}>
          <IngredientBadgeGrid
            positives={report.positive_ingredients}
            concerns={report.ingredients_of_concern}
            gemmaResolved={report.gemma_resolved_ingredients ?? []}
            baseDelay={0.25}
          />
        </SectionReveal>
      )}

      {/* ── Health Considerations ── */}
      {report.health_considerations.length > 0 && (
        <SectionReveal title="Health Considerations" delay={0.35}>
          <div className="flex flex-col gap-2">
            {report.health_considerations.map((item, i) => (
              <motion.div
                key={item.title}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  item.type === 'warning'
                    ? 'border-rose-100 bg-rose-50'
                    : item.type === 'positive'
                    ? 'border-emerald-100 bg-emerald-50'
                    : 'border-[#e0f2fe] bg-[#f0f9ff]'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
              >
                <AlertTriangle
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    item.type === 'warning'
                      ? 'text-rose-400'
                      : item.type === 'positive'
                      ? 'text-emerald-500'
                      : 'text-[#4285F4]'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-[#202124]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[#5f6368]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      )}

      {/* ── Allergens ── */}
      {report.allergens.length > 0 && (
        <SectionReveal title="Allergens Detected" delay={0.45}>
          <div className="flex flex-wrap gap-2">
            {report.allergens.map((item, i) => (
              <motion.div
                key={item.name}
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.07 }}
                title={item.triggered_by.join(', ')}
              >
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <p className="text-xs font-semibold text-amber-800">{item.name}</p>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      )}

      {/* ── Unresolved ingredients (not resolved by engine or Gemma) ── */}
      {report.unresolved_ingredients.length > 0 &&
        (report.gemma_resolved_ingredients ?? []).length === 0 && (
          <SectionReveal title="Unrecognised Items" delay={0.5}>
            <div className="rounded-xl border border-[#e8eaed] bg-white p-3">
              <p className="text-xs text-[#5f6368]">
                These items weren't found in our reference dataset:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.unresolved_ingredients.map((item, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-[#f1f3f4] px-2 py-0.5 text-xs text-[#5f6368]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </SectionReveal>
        )}
    </div>
  );
}

// ── Demo skeleton ─────────────────────────────────────────────────────────────

function DemoReport() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-8">
      <motion.h2
        className="text-2xl font-bold text-[#202124]"
        style={{ fontFamily: 'var(--font-heading)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Health Analysis
      </motion.h2>

      {/* Score skeleton */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5f6368]">
          Health Score
        </h3>
        <div className="flex items-center gap-5 rounded-2xl border border-[#e8eaed] bg-white p-4">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e8eaed" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#4285F4"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * 0.65 }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <span className="absolute text-2xl font-bold text-[#202124]">--</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#5f6368]">Awaiting scan</p>
            <p className="mt-1 text-xs text-[#5f6368]">
              Scan a food label to see your health score.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder pill grid */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5f6368]">
          Ingredients
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {['Positive', 'Concerning', 'Gemma AI'].map((label, i) => (
            <span
              key={label}
              className={`inline-flex h-6 w-20 animate-pulse rounded-full border ${
                i === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : i === 1
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-blue-200 bg-blue-50'
              }`}
            />
          ))}
        </div>
      </div>

      <motion.div
        className="mt-2 rounded-xl bg-[#f0f4ff] px-4 py-3 text-xs text-[#4285F4]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        💡 Scan a food label to see the full health analysis powered by the rule
        engine + Gemma AI fallback.
      </motion.div>
    </div>
  );
}
