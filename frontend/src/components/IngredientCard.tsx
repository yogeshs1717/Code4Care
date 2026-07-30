'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

export interface IngredientProps {
  name: string;
  category: string;
  status: 'safe' | 'warning';
}

interface IngredientCardProps {
  ingredient: IngredientProps;
  variants?: Variants;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({ ingredient, variants }) => {
  const isSafe = ingredient.status === 'safe';

  return (
    <motion.div
      variants={variants}
      className={`p-3 rounded-2xl backdrop-blur-xl border flex items-center gap-3 shadow-lg transition-all ${
        isSafe
          ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-950'
          : 'bg-amber-50/80 border-amber-200/60 text-amber-950'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isSafe ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
        }`}
      >
        {isSafe ? '✓' : '⚠'}
      </div>

      <div className="flex flex-col text-left">
        <span className="font-semibold text-xs tracking-tight">{ingredient.name}</span>
        <span className={`text-[10px] ${isSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ingredient.category}
        </span>
      </div>
    </motion.div>
  );
};