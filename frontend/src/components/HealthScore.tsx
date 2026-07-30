'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface HealthScoreProps {
  score: number;
  pros: string[];
  warnings: string[];
  variants?: Variants;
}

export const HealthScore: React.FC<HealthScoreProps> = ({
  score,
  pros,
  warnings,
  variants,
}) => {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-xs bg-white/80 backdrop-blur-2xl border border-white/60 p-5 rounded-[24px] shadow-2xl shadow-emerald-950/10"
    >
      {/* Header & Radial Score */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Health Score</h3>
          <p className="text-[11px] text-slate-500">AI Safety Index</p>
        </div>
        <div className="flex items-baseline gap-0.5 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200/50">
          <span className="text-xl font-extrabold text-emerald-600">{score}</span>
          <span className="text-xs text-slate-400 font-medium">/100</span>
        </div>
      </div>

      {/* Pros Section */}
      <div className="mb-3 text-left">
        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 mb-1.5 block">
          Pros
        </span>
        <div className="space-y-1">
          {pros.map((pro, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>{pro}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings Section */}
      <div className="text-left">
        <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 mb-1.5 block">
          Warnings
        </span>
        <div className="space-y-1">
          {warnings.map((warning, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="text-amber-500 font-bold">⚠</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};