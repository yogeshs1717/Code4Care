import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // ── Spring-accelerated scroll values for smooth motion ──
  const raw = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1]);
  const progress = useSpring(raw, { stiffness: 60, damping: 25, mass: 0.8 });

  // Jar: left→center. Phone: right→center.
  const jarX = useTransform(progress, [0, 0.6], ['-30vw', '0vw']);
  const jarScale = useTransform(progress, [0, 0.6], [0.6, 1]);
  const jarRotate = useTransform(progress, [0, 0.6], [15, 0]);

  const phoneX = useTransform(progress, [0.1, 0.6], ['40vw', '0vw']);
  const phoneScale = useTransform(progress, [0.1, 0.6], [0.5, 1]);

  // Scanline: fires after convergence
  const scanlineTop = useTransform(
    progress,
    [0.55, 0.65, 0.75, 0.85],
    ['-10%', '110%', '110%', '-10%']
  );
  const scanlineOpacity = useTransform(
    progress,
    [0.55, 0.6, 0.75, 0.8],
    [0, 1, 1, 0]
  );

  // Jar fade / phone scale-up for reveal
  const jarOpacity = useTransform(progress, [0.7, 0.85], [1, 0]);
  const jarBlur = useTransform(progress, [0.7, 0.85], ['0px', '8px']);
  const phoneReveal = useTransform(progress, [0.75, 1], [1, 1.15]);

  // Scroll indicator
  const scrollHintOpacity = useTransform(progress, [0, 0.2, 0.5], [1, 1, 0]);

  return (
    <div
      ref={containerRef}
      className="relative h-[300vh] w-full"
      style={{ fontFamily: 'var(--font-heading)' }}
    >
      {/* ── Sticky viewport ── */}
      <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-[#f8f5f0]">
        {/* Ambient background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-50/40 via-transparent to-amber-100/30" />

        {/* ── Typography — fades out on scroll ── */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center z-10"
          style={{ opacity: useTransform(progress, [0, 0.3], [1, 0]) }}
        >
          <motion.h1
            className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-600 bg-clip-text text-[clamp(3rem,8vw,6rem)] font-extrabold leading-none tracking-tight text-transparent max-w-4xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Code4Care
          </motion.h1>
          <motion.p
            className="mt-4 text-lg text-stone-600 sm:text-xl font-medium max-w-md"
            style={{ fontFamily: 'var(--font-body)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Ingredient Intelligence & Health Analysis
          </motion.p>
        </motion.div>

        {/* ── Scroll hint ── */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          style={{ opacity: scrollHintOpacity }}
        >
          <motion.div
            className="flex flex-col items-center gap-2 text-sm font-medium text-stone-500"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span>Scroll to explore</span>
          </motion.div>
        </motion.div>

        {/* ── 3D Intersection Scene ── */}
        <div className="relative flex h-[60vh] w-full max-w-2xl items-center justify-center">
          {/* ── Food Jar (Left) ── */}
          <motion.div
            className="absolute flex items-center justify-center"
            style={{
              x: jarX,
              scale: jarScale,
              rotate: jarRotate,
              opacity: jarOpacity,
              filter: `blur(${jarBlur})`,
            }}
          >
            <div className="relative flex h-48 w-36 flex-col items-center sm:h-56 sm:w-44">
              {/* Jar body */}
              <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-stone-200 bg-white shadow-xl">
                {/* Lid */}
                <div className="h-5 w-full rounded-t-xl bg-gradient-to-r from-amber-600 to-amber-500" />
                {/* Label area */}
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3">
                  <div className="h-2 w-3/4 rounded-full bg-stone-200" />
                  <div className="h-2 w-1/2 rounded-full bg-stone-200" />
                  <div className="mt-2 flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <div className="h-2 w-16 rounded-full bg-stone-200" />
                  </div>
                </div>
              </div>
              {/* Glossy reflection */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-white/30 via-transparent to-transparent" />
            </div>
          </motion.div>

          {/* ── Smartphone (Right) ── */}
          <motion.div
            className="absolute flex items-center justify-center"
            style={{
              x: phoneX,
              scale: phoneScale,
              scaleX: phoneReveal,
            }}
          >
            <div className="relative flex h-52 w-28 flex-col overflow-hidden rounded-[1.5rem] border-[3px] border-stone-800 bg-white shadow-2xl sm:h-64 sm:w-32">
              {/* Notch */}
              <div className="absolute left-1/2 top-0 z-10 h-4 w-16 -translate-x-1/2 rounded-b-xl bg-stone-800" />
              {/* Screen content */}
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 pt-4">
                {/* Camera reticle */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                </div>
                <div className="h-1.5 w-3/4 rounded-full bg-stone-200" />
                <div className="h-1.5 w-1/2 rounded-full bg-stone-200" />
                {/* "Scan" button */}
                <div className="mt-1 h-3 w-3/4 rounded-full bg-amber-500" />
              </div>
            </div>
          </motion.div>

          {/* ── Scanline ── */}
          <motion.div
            className="pointer-events-none absolute left-1/2 h-0.5 w-48 -translate-x-1/2"
            style={{
              top: scanlineTop,
              opacity: scanlineOpacity,
              background:
                'linear-gradient(90deg, transparent, #f59e0b, #f59e0b, transparent)',
              boxShadow: '0 0 12px #f59e0b, 0 0 24px #f59e0b80',
            }}
          />

          {/* ── Enter App Button ── */}
          <motion.button
            className="absolute bottom-0 z-20 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-amber-500/30 hover:from-amber-500 hover:to-amber-400 active:scale-95 transition-all"
            style={{
              opacity: useTransform(progress, [0.85, 1], [0, 1]),
              y: useTransform(progress, [0.85, 1], [20, 0]),
              pointerEvents: 'auto' as const,
            }}
            onClick={onEnterApp}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Scan Your Food
          </motion.button>
        </div>
      </div>
    </div>
  );
}
