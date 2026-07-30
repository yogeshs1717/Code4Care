import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { DeterministicReport } from '../types/health';

interface HealthReportViewProps {
  report: DeterministicReport | null;
  aiSummary?: string | null;
}

export function HealthReportView({ report, aiSummary }: HealthReportViewProps) {
  if (!report) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
        <motion.h2
          className="text-2xl font-bold text-[#202124]"
          style={{ fontFamily: 'var(--font-heading)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Health Analysis
        </motion.h2>
        <p className="text-sm text-[#5f6368]">Preparing your report...</p>
      </div>
    );
  }

  const { health_score, processing_level, positive_ingredients, ingredients_of_concern, allergens, health_considerations, unresolved_ingredients } = report;
  const circumference = 2 * Math.PI * 42;
  const scoreOffset = circumference * (1 - health_score.score / 100);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
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
          <motion.div
            className="rounded-xl border border-[#c8e6ff] bg-[#f0f7ff] p-4 text-sm leading-relaxed text-[#1a3a5c]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            ✨ {aiSummary}
          </motion.div>
        </SectionReveal>
      )}

      {/* ── Health Score ── */}
      <SectionReveal title="Health Score" delay={0.1}>
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none" stroke="#e8eaed" strokeWidth="8"
              />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none" stroke={health_score.color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: scoreOffset }}
                transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <motion.span
              className="absolute text-2xl font-bold"
              style={{ color: health_score.color }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              {health_score.score}
            </motion.span>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: health_score.color }}>
              {health_score.label}
            </p>
            <p className="mt-1 text-xs text-[#5f6368]">
              Score based on ingredient analysis
            </p>
          </div>
        </div>
      </SectionReveal>

      {/* ── Processing Level ── */}
      <SectionReveal title="Processing Level" delay={0.2}>
        <div className="rounded-xl border border-[#e8eaed] bg-white p-4">
          <p className="font-semibold" style={{ color: processing_level.color }}>
            {processing_level.label}
          </p>
          <p className="mt-1 text-xs text-[#5f6368]">{processing_level.description}</p>
        </div>
      </SectionReveal>

      {/* ── Positive Ingredients ── */}
      {positive_ingredients.length > 0 && (
        <SectionReveal title="Positive Ingredients" delay={0.3}>
          {positive_ingredients.map((item, i) => (
            <motion.div
              key={item.name}
              className="flex items-center gap-3 rounded-xl border border-[#e8eaed] bg-white p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34A853]/10">
                <span className="text-sm text-[#34A853]">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#202124]">{item.name}</p>
                <p className="text-xs text-[#5f6368]">{item.benefit}</p>
              </div>
            </motion.div>
          ))}
        </SectionReveal>
      )}

      {/* ── Ingredients of Concern ── */}
      {ingredients_of_concern.length > 0 && (
        <SectionReveal title="Ingredients of Concern" delay={0.4}>
          {ingredients_of_concern.map((item, i) => (
            <motion.div
              key={item.name}
              className="flex items-start gap-3 rounded-xl border border-[#fee2e2] bg-[#fef2f2] p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA4335]/10">
                <span className="text-sm text-[#EA4335]">!</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#202124]">{item.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    item.severity === 'high'
                      ? 'bg-[#EA4335]/10 text-[#EA4335]'
                      : 'bg-[#FBBC04]/10 text-[#92400e]'
                  }`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#5f6368]">{item.concern}</p>
              </div>
            </motion.div>
          ))}
        </SectionReveal>
      )}

      {/* ── Allergens ── */}
      {allergens.length > 0 && (
        <SectionReveal title="⚠️ Allergens Detected" delay={0.5}>
          <div className="flex flex-wrap gap-2">
            {allergens.map((allergen, i) => (
              <motion.div
                key={allergen.name}
                className="rounded-lg border border-[#fbbc04]/30 bg-[#fefce8] px-3 py-2 text-xs"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <p className="font-medium text-[#92400e]">{allergen.name}</p>
                <p className="mt-0.5 text-[10px] text-[#a16207]">
                  from: {allergen.triggered_by.join(', ')}
                </p>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      )}

      {/* ── Health Considerations ── */}
      {health_considerations.length > 0 && (
        <SectionReveal title="Health Considerations" delay={0.6}>
          {health_considerations.map((item, i) => (
            <motion.div
              key={item.title}
              className={`rounded-xl border p-3 ${
                item.type === 'warning'
                  ? 'border-[#fbbc04]/30 bg-[#fffbeb]'
                  : 'border-[#c8e6ff] bg-[#f0f7ff]'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
            >
              <p className="text-sm font-medium text-[#202124]">
                {item.type === 'warning' ? '⚠️' : 'ℹ️'} {item.title}
              </p>
              <p className="mt-1 text-xs text-[#5f6368]">{item.description}</p>
            </motion.div>
          ))}
        </SectionReveal>
      )}

      {/* ── Unresolved Ingredients ── */}
      {unresolved_ingredients.length > 0 && (
        <SectionReveal title="Unresolved Ingredients" delay={0.7}>
          <div className="rounded-xl border border-[#e8eaed] bg-white p-3">
            <p className="text-xs text-[#5f6368] mb-2">
              These ingredients could not be identified in our database:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unresolved_ingredients.map((name) => (
                <span key={name} className="rounded-md bg-[#f1f3f4] px-2 py-1 text-xs text-[#5f6368]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </SectionReveal>
      )}
    </div>
  );
}

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
