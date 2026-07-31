import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

interface ScanAnimationProps {
  progress?: number;
  status?: string;
}

export function ScanAnimation({ progress = 0.5, status = 'Reading your label...' }: ScanAnimationProps) {
  return (
    <motion.div className="flex flex-col items-center justify-center gap-8 py-20 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      {/* Scanning device */}
      <div className="relative flex h-52 w-36 items-center justify-center">
        <motion.div className="absolute inset-0 rounded-[2rem] border-2 border-amber-300/40"
          animate={{ boxShadow: ['0 0 20px rgba(217,119,6,0.08)', '0 0 40px rgba(217,119,6,0.2)', '0 0 20px rgba(217,119,6,0.08)'] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <div className="relative mx-2 mt-3 flex flex-1 flex-col overflow-hidden rounded-xl bg-amber-50/60 border border-amber-200/40">
          <motion.div className="absolute left-0 right-0 z-10 h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, #d97706, transparent)', boxShadow: '0 0 8px #d97706' }}
            animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
          <div className="flex flex-col gap-2.5 p-3 pt-7">
            {[80, 65, 90, 55, 75].map((w, i) => (
              <motion.div key={i} className="h-1.5 rounded-full bg-amber-200/60" style={{ width: `${w}%` }}
                animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }} />
            ))}
          </div>
        </div>
      </div>

      <motion.div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <ScanLine className="h-6 w-6 text-white" />
      </motion.div>

      <div className="w-48">
        <div className="h-1 overflow-hidden rounded-full bg-amber-200/40">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
            initial={{ width: '0%' }} animate={{ width: `${Math.max(5, progress * 100)}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      <motion.p className="text-sm text-stone-500" key={status}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {status}
      </motion.p>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="h-2 w-2 rounded-full bg-amber-500"
            animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, delay: i * 0.25, repeat: Infinity }} />
        ))}
      </div>
    </motion.div>
  );
}
