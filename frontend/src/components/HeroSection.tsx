import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Camera, Sparkles, ArrowDown } from 'lucide-react';

export function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // ── Spring-accelerated scroll values for smooth motion ──
  const raw = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1]);
  const progress = useSpring(raw, { stiffness: 60, damping: 25, mass: 0.8 });

  // Responsive offsets for jar & phone
  const jarX = useTransform(progress, [0, 0.6], ['-35vw', '0vw']);
  const jarScale = useTransform(progress, [0, 0.6], [0.65, 1]);
  const jarRotate = useTransform(progress, [0, 0.6], [12, 0]);

  const phoneX = useTransform(progress, [0.1, 0.6], ['35vw', '0vw']);
  const phoneScale = useTransform(progress, [0.1, 0.6], [0.55, 1]);

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
  const phoneReveal = useTransform(progress, [0.75, 1], [1, 1.12]);

  // Scroll indicator & top bar fade
  const scrollHintOpacity = useTransform(progress, [0, 0.2, 0.45], [1, 1, 0]);
  const topBarOpacity = useTransform(progress, [0, 0.4], [1, 0.2]);

  return (
    <div
      ref={containerRef}
      className="relative h-[250vh] sm:h-[300vh] w-full select-none"
      style={{ fontFamily: 'var(--font-heading)' }}
    >
      {/* ── Sticky viewport ── */}
      <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-slate-950 text-white">
        {/* Ambient neon radial gradients */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-emerald-600/15 blur-[100px]" />

        {/* ── Direct Header Action Bar for Phones ── */}
        <motion.div
          className="absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-5 sm:px-8"
          style={{ opacity: topBarOpacity }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-slate-300">
              Code4Care
            </span>
          </div>

          <button
            onClick={onEnterApp}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Scan Now</span>
          </button>
        </motion.div>

        {/* ── Hero Typography ── */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center z-10"
          style={{ opacity: useTransform(progress, [0, 0.28], [1, 0]) }}
        >
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1 text-[11px] font-bold text-indigo-300 mb-4 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
            <span>Powered by Gemma 4 AI & Health Rule Engine</span>
          </motion.div>

          <motion.h1
            className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-[clamp(2.4rem,8vw,5.5rem)] font-black leading-none tracking-tight text-transparent max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Ingredient Intelligence
          </motion.h1>

          <motion.p
            className="mt-3.5 text-sm sm:text-base text-slate-400 max-w-md font-normal leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Scan food labels instantly. Uncover additives, allergens, and health scores in seconds.
          </motion.p>
        </motion.div>

        {/* ── Scroll hint ── */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          style={{ opacity: scrollHintOpacity }}
        >
          <motion.div
            className="flex flex-col items-center gap-1.5 text-xs font-bold text-slate-400"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="h-4 w-4 text-indigo-400" />
            <span>Scroll or tap Scan Now</span>
          </motion.div>
        </motion.div>

        {/* ── 3D Intersection Scene ── */}
        <div className="relative flex h-[55vh] w-full max-w-md sm:max-w-xl items-center justify-center">
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
            <div className="relative flex h-44 w-32 flex-col items-center sm:h-56 sm:w-44">
              {/* Jar body */}
              <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                {/* Lid */}
                <div className="h-5 w-full bg-indigo-600 rounded-t-xl" />
                {/* Label area */}
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3">
                  <div className="h-2 w-3/4 rounded-full bg-slate-700" />
                  <div className="h-2 w-1/2 rounded-full bg-slate-800" />
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-full bg-emerald-400" />
                    <div className="h-2 w-16 rounded-full bg-slate-700" />
                  </div>
                </div>
              </div>
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
            <div className="relative flex h-52 w-28 flex-col overflow-hidden rounded-[1.8rem] border-[3px] border-slate-700 bg-slate-900 shadow-2xl sm:h-64 sm:w-34">
              {/* Notch */}
              <div className="absolute left-1/2 top-0 z-10 h-3.5 w-14 -translate-x-1/2 rounded-b-xl bg-slate-950" />
              {/* Screen content */}
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 pt-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-500/10">
                  <Camera className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-1.5 w-3/4 rounded-full bg-slate-700" />
                <div className="h-1.5 w-1/2 rounded-full bg-slate-800" />
                <div className="mt-2 h-3.5 w-3/4 rounded-full bg-indigo-600" />
              </div>
            </div>
          </motion.div>

          {/* ── Scanline ── */}
          <motion.div
            className="pointer-events-none absolute left-1/2 h-1 w-44 -translate-x-1/2"
            style={{
              top: scanlineTop,
              opacity: scanlineOpacity,
              background: 'linear-gradient(90deg, transparent, #818CF8, #818CF8, transparent)',
              boxShadow: '0 0 16px #818CF8, 0 0 28px #818CF890',
            }}
          />

          {/* ── Final Action Button ── */}
          <motion.button
            className="absolute bottom-2 z-20 flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-black tracking-wide text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-95 transition-all"
            style={{
              opacity: useTransform(progress, [0.8, 1], [0, 1]),
              y: useTransform(progress, [0.8, 1], [20, 0]),
              pointerEvents: 'auto' as const,
            }}
            onClick={onEnterApp}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Camera className="h-4 w-4" />
            <span>Scan Food Label</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
