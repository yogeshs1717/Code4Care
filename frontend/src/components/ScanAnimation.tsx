import { motion } from 'framer-motion';

interface ScanAnimationProps {
  progress?: number; // 0–1
  status?: string;
}

export function ScanAnimation({
  progress = 0.5,
  status = 'Reading your label...',
}: ScanAnimationProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-8 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Scanning Device Graphic ── */}
      <div className="relative flex h-48 w-32 items-center justify-center">
        {/* Phone frame */}
        <motion.div
          className="absolute inset-0 rounded-[1.75rem] border-2 border-[#4285F4]"
          animate={{
            boxShadow: [
              '0 0 20px rgba(66,133,244,0.15)',
              '0 0 40px rgba(66,133,244,0.3)',
              '0 0 20px rgba(66,133,244,0.15)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Screen */}
        <div className="relative mx-2 mt-3 flex flex-1 flex-col overflow-hidden rounded-xl bg-[#f0f4ff]">
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 z-10 h-0.5"
            style={{
              background:
                'linear-gradient(90deg, transparent, #4285F4, transparent)',
              boxShadow: '0 0 8px #4285F4',
            }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Fake ingredient lines */}
          <div className="flex flex-col gap-2 p-3 pt-6">
            <motion.div
              className="h-1.5 rounded-full bg-[#e8eaed]"
              style={{ width: '80%' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: 0, repeat: Infinity }}
            />
            <motion.div
              className="h-1.5 rounded-full bg-[#e8eaed]"
              style={{ width: '65%' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: 0.2, repeat: Infinity }}
            />
            <motion.div
              className="h-1.5 rounded-full bg-[#e8eaed]"
              style={{ width: '90%' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: 0.4, repeat: Infinity }}
            />
            <motion.div
              className="h-1.5 rounded-full bg-[#e8eaed]"
              style={{ width: '55%' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: 0.6, repeat: Infinity }}
            />
            <motion.div
              className="h-1.5 rounded-full bg-[#e8eaed]"
              style={{ width: '75%' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: 0.8, repeat: Infinity }}
            />
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-48">
        <div className="h-1 overflow-hidden rounded-full bg-[#e8eaed]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#34A853]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(5, progress * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* ── Status text ── */}
      <motion.p
        className="text-sm text-[#5f6368]"
        key={status}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {status}
      </motion.p>

      {/* ── Particle dots ── */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-[#4285F4]"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 1.2,
              delay: i * 0.25,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
