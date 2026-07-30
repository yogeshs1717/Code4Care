'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ScannerProps {
  isAnalyzing: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ isAnalyzing }) => {
  return (
    <div className="relative w-52 h-68 border border-emerald-500/40 rounded-2xl overflow-hidden backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(34,197,94,0.15)]">
      {/* Animated HUD Corner Brackets */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />
      </motion.div>

      {/* Continuous Scanning Laser Line */}
      <motion.div
        className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_18px_#22c55e]"
        animate={{
          y: [0, 260, 0],
        }}
        transition={{
          duration: 2.0,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Animated Center Autofocus Reticle */}
      <motion.div
        className="absolute inset-0 m-auto w-20 h-20 border border-emerald-400/60 rounded-xl flex items-center justify-center"
        animate={{
          scale: [0.95, 1.05, 0.95],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </motion.div>

      {/* Pulsing Detection Ring when Scanning Label */}
      {isAnalyzing && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-500/30 rounded-full border border-emerald-400"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 2.2], opacity: [1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </div>
  );
};