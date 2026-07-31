import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Scan, Shield, Brain, Leaf, ArrowRight, Sparkles, Camera,
} from 'lucide-react';

function Reveal({ delay = 0, children, className = '' }: {
  delay?: number; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: Scan,
    title: 'Snap & Scan',
    desc: 'Photograph any packaged food label and our AI extracts the ingredient list in seconds.',
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    icon: Shield,
    title: 'Know What You Eat',
    desc: 'No more chemical jargon. We flag preservatives, additives, and artificial ingredients in plain language.',
    gradient: 'from-amber-600 to-yellow-600',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    desc: 'Gemma AI explains exactly what each ingredient means for your health — no guesswork.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Leaf,
    title: 'Smarter Choices',
    desc: 'Get a clear health score, processing level, and personalized recommendations for better alternatives.',
    gradient: 'from-yellow-500 to-amber-600',
  },
];

export function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-dvh bg-[#f8f5f0] overflow-hidden">
      {/* ── Decorative orbs ── */}
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-amber-200/30 blur-[120px]" />
      <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] rounded-full bg-amber-300/20 blur-[120px]" />

      {/* ── Code4Care logo top-left ── */}
      <div className="absolute top-6 left-4 sm:top-8 sm:left-8 z-20 flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20">
          <Scan className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-stone-800">
          Code<span className="text-amber-600">4</span>Care
        </span>
      </div>

      {/* ── Hero Section ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-4 pt-20 pb-16">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/80 px-4 py-1.5 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700/80">
            Ingredient Intelligence
          </span>
        </motion.div>

        {/* ── Jar + Phone visual ── */}
        <motion.div
          className="flex items-center gap-3 sm:gap-6 mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Jar */}
          <motion.div
            className="relative flex h-36 w-28 flex-col items-center sm:h-44 sm:w-32"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-lg">
              <div className="h-5 w-full rounded-t-xl bg-gradient-to-r from-amber-500 to-amber-600" />
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3">
                <div className="h-2 w-3/4 rounded-full bg-amber-100" />
                <div className="h-2 w-1/2 rounded-full bg-amber-100" />
                <div className="mt-2 flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="h-2 w-16 rounded-full bg-amber-100" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-white/40 via-transparent to-transparent" />
          </motion.div>

          {/* Scanline arrow */}
          <motion.div
            className="hidden sm:flex text-amber-400"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12h20M18 6l6 6-6 6" />
            </svg>
          </motion.div>

          {/* Phone */}
          <motion.div
            className="relative flex h-40 w-20 flex-col overflow-hidden rounded-[1.5rem] border-[3px] border-amber-300/40 bg-white shadow-xl sm:h-48 sm:w-24"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute left-1/2 top-0 z-10 h-4 w-12 -translate-x-1/2 rounded-b-xl bg-amber-300/30" />
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400/50">
                <Camera className="h-4 w-4 text-amber-600" />
              </div>
              <div className="h-1.5 w-3/4 rounded-full bg-amber-100" />
              <div className="h-1.5 w-1/2 rounded-full bg-amber-100" />
              <div className="mt-1 h-2.5 w-3/4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600" />
            </div>
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-center text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-[1.1] tracking-tight max-w-3xl"
          style={{ fontFamily: 'var(--font-heading)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-stone-800">Know Your</span>
          <br />
          <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Food
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mt-4 text-center text-base sm:text-lg text-stone-500 max-w-lg leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          Snap a label. Instantly decode every ingredient — no more guessing what's really in your food.
        </motion.p>

        {/* CTA */}
        <motion.button
          onClick={onEnterApp}
          className="group relative mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Scan className="h-5 w-5" />
          <span>Scan Your Food</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
        </motion.button>

        {/* Trust */}
        <motion.p
          className="mt-5 text-xs text-stone-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Powered by Gemma AI · No account needed · Free to use
        </motion.p>
      </div>

      {/* ── Features Section ── */}
      <div ref={featuresRef} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-32">
        <Reveal delay={0.1}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-800" style={{ fontFamily: 'var(--font-heading)' }}>
              Why <span className="text-amber-600">Code4Care</span>?
            </h2>
            <p className="mt-3 text-stone-500 text-base max-w-xl mx-auto">
              Food labels are designed for regulators, not for you. We change that.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={0.15 + i * 0.08}>
              <motion.div
                className="group relative rounded-2xl border border-amber-200/40 bg-white/70 p-6 sm:p-8 hover:bg-white/90 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300"
                whileHover={{ y: -4 }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 shadow-lg shadow-amber-500/10`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{feature.desc}</p>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/0 via-amber-400/0 to-amber-400/0 group-hover:from-amber-400/5 group-hover:via-transparent group-hover:to-amber-400/5 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
              </motion.div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.5}>
          <motion.div className="mt-16 text-center">
            <motion.button
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-50/80 px-6 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100/80 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Scan className="h-4 w-4" />
              Start Your First Scan
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </Reveal>
      </div>

      {/* ── Bottom closing section ── */}
      <div className="relative z-10 border-t border-amber-200/30 bg-amber-50/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/50 mb-3">
                How It Works
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { step: '01', title: 'Snap', desc: 'Take a photo of the ingredient list' },
                  { step: '02', title: 'Analyze', desc: 'Our engine decodes every ingredient' },
                  { step: '03', title: 'Understand', desc: 'Get a clear score and AI explanation' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-4">
                    <span className="text-amber-600/70 text-sm font-bold w-6">{s.step}</span>
                    <div>
                      <span className="text-stone-800 text-sm font-semibold">{s.title}</span>
                      <p className="text-xs text-stone-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right md:text-left">
              <p className="text-stone-600 text-sm leading-relaxed italic">
                "The food you eat can be either the safest and most powerful form of medicine
                or the slowest form of poison."
              </p>
              <p className="text-stone-400 text-xs mt-2">— Ann Wigmore</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-amber-200/30 flex items-center justify-between">
            <p className="text-xs text-stone-400">© {new Date().getFullYear()} Code4Care</p>
            <p className="text-xs text-stone-400">Not medical advice</p>
          </div>
        </div>
      </div>
    </div>
  );
}
