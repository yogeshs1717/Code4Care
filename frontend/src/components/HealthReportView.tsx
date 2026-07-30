import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface HealthReportViewProps {
  /** Deterministic report from the backend — null when the endpoint is not yet available */
  report: null;
  /** Demo mode: shows placeholder content when the backend endpoint isn't built yet */
}

/**
 * Health Report View — renders deterministic data from POST /api/v1/analyze.
 *
 * Currently the backend only has POST /ocr. This component is fully wired and
 * ready to render real data once the analyze endpoint is added.
 */
export function HealthReportView({ report }: HealthReportViewProps) {
  const isDemo = report === null;

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
      <motion.h2
        className="text-2xl font-bold text-[#202124]"
        style={{ fontFamily: 'var(--font-heading)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isDemo ? 'Health Analysis' : 'Your Health Report'}
      </motion.h2>

      {isDemo ? (
        <DemoReport />
      ) : (
        <p className="text-sm text-[#5f6368]">Loading report data...</p>
      )}
    </div>
  );
}

function DemoReport() {
  return (
    <div className="flex flex-col gap-5">
      <SectionReveal title="Health Score" delay={0.1}>
        <div className="flex items-center gap-4">
          {/* Circular gauge */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none" stroke="#e8eaed" strokeWidth="8"
              />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none" stroke="#4285F4" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * 0.35 }}
                transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <span className="absolute text-2xl font-bold text-[#202124]">--</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#5f6368]">Awaiting Backend</p>
            <p className="mt-1 text-xs text-[#5f6368]">
              The POST /api/v1/analyze endpoint is not yet available.
              <br />
              Your ingredient data will appear here once it is.
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal title="Processing Level" delay={0.2}>
        <div className="rounded-xl border border-[#e8eaed] bg-white p-4">
          <div className="h-4 w-24 rounded bg-[#f1f3f4] animate-pulse" />
          <div className="mt-2 h-3 w-48 rounded bg-[#f1f3f4] animate-pulse" />
        </div>
      </SectionReveal>

      <SectionReveal title="Positive Ingredients" delay={0.3}>
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-[#e8eaed] bg-white p-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34A853]/10">
              <span className="text-sm text-[#34A853]">+</span>
            </div>
            <div>
              <div className="h-3 w-20 rounded bg-[#f1f3f4] animate-pulse" />
              <div className="mt-1 h-2 w-36 rounded bg-[#f1f3f4] animate-pulse" />
            </div>
          </motion.div>
        ))}
      </SectionReveal>

      <SectionReveal title="Ingredients of Concern" delay={0.4}>
        {[1].map((i) => (
          <motion.div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-[#fee2e2] bg-[#fef2f2] p-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA4335]/10">
              <span className="text-sm text-[#EA4335]">!</span>
            </div>
            <div>
              <div className="h-3 w-24 rounded bg-[#fee2e2] animate-pulse" />
              <div className="mt-1 h-2 w-40 rounded bg-[#fee2e2] animate-pulse" />
            </div>
          </motion.div>
        ))}
      </SectionReveal>

      <SectionReveal title="Allergens" delay={0.5}>
        <div className="flex flex-wrap gap-2">
          {[1, 2].map((i) => (
            <motion.div
              key={i}
              className="rounded-lg border border-[#fbbc04]/30 bg-[#fefce8] px-3 py-1.5 text-xs font-medium text-[#92400e]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="h-3 w-16 rounded bg-[#fde68a] animate-pulse" />
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      {/* Future note */}
      <motion.div
        className="mt-4 rounded-xl bg-[#f0f4ff] px-4 py-3 text-xs text-[#4285F4]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        💡 Full analysis will appear here once the backend is complete.
        Currently the backend supports only POST /ocr.
      </motion.div>
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
