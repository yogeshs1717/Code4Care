'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { AnimatedBottle } from './AnimatedBottle';
import { AnimatedPhone } from './AnimatedPhone';
import { Scanner } from './Scanner';
import { IngredientCard, IngredientProps } from './IngredientCard';
import { HealthScore } from './HealthScore';

const ingredientsData: IngredientProps[] = [
  { name: 'Turmeric', category: 'Natural Ingredient', status: 'safe' },
  { name: 'Sodium Benzoate', category: 'Preservative', status: 'warning' },
  { name: 'Salt', category: 'Essential Mineral', status: 'safe' },
  { name: 'Artificial Colour', category: 'Consume in Moderation', status: 'warning' },
];

export const HeroSection: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnalyzing(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Framer Motion Animation Variants (X-axis entry to stay perfectly on the same line)
  const bottleVariants: Variants = {
    hidden: { x: '-100vw', rotate: -180 },
    visible: {
      x: 0,
      rotate: 0,
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 80,
        duration: 1.8,
      },
    },
  };

  const phoneVariants: Variants = {
    hidden: { x: '100vw', rotate: 15 },
    visible: {
      x: 0,
      rotate: 0,
      transition: {
        delay: 1.2,
        type: 'spring',
        damping: 20,
        stiffness: 90,
        duration: 1.6,
      },
    },
  };

  const cardsContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 2.8,
        staggerChildren: 0.25,
      },
    },
  };

  const cardItemVariants: Variants = {
    hidden: { opacity: 0, x: -20, scale: 0.8 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 120, damping: 12 },
    },
  };

  const healthScoreVariants: Variants = {
    hidden: { opacity: 0, x: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { delay: 4.2, type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <section className="relative w-full min-h-screen bg-white text-slate-900 overflow-x-hidden pt-20 sm:pt-28 pb-16 flex flex-col justify-center">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[600px] bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-transparent pointer-events-none rounded-b-[40px] sm:rounded-b-[60px]" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[280px] sm:w-[600px] h-[180px] sm:h-[300px] bg-emerald-300/20 blur-[60px] sm:blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        
        {/* Headline Section */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12 px-2">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] sm:text-xs font-semibold tracking-wide uppercase mb-3 sm:mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Nutrition Analysis
          </motion.span>
          
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]"
          >
            Know what you eat with{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Ingredient Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-xs sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed"
          >
            Instant camera-based ingredient breakdown. Detect hidden additives, preservatives, and nutritional safety in seconds.
          </motion.p>
        </div>

        {/* Dynamic Studio Stage: Enforces Single Line Horizontal Viewport Layout across Mobile + Desktop */}
        <div className="relative w-full overflow-visible my-4 flex items-center justify-center">
          <div className="w-full flex flex-row items-center justify-center scale-[0.62] xs:scale-[0.68] sm:scale-85 md:scale-95 lg:scale-100 origin-center transition-transform duration-300 gap-2 sm:gap-6 lg:gap-12">
            
            {/* 1. Pickle Bottle Graphic Layer */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <AnimatedBottle customVariants={bottleVariants} />
              
              {/* Floating Analytical Ingredient Overlay Cards */}
              <motion.div
                variants={cardsContainerVariants}
                initial="hidden"
                animate="visible"
                className="absolute -right-6 sm:-right-12 lg:-right-16 top-2 sm:top-4 flex flex-col gap-2 z-30 w-36 sm:w-52"
              >
                {ingredientsData.map((item, idx) => (
                  <IngredientCard key={idx} ingredient={item} variants={cardItemVariants} />
                ))}
              </motion.div>
            </div>

            {/* 2. Interactive Smartphone Scanning Camera Layer */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <AnimatedPhone customVariants={phoneVariants}>
                <Scanner isAnalyzing={isAnalyzing} />
              </AnimatedPhone>
            </div>

            {/* 3. Final Evaluated Health Score Summary UI Panel */}
            <div className="relative flex-shrink-0 hidden xs:flex items-center justify-center">
              <HealthScore
                score={82}
                pros={['No Palm Oil', 'Natural Spices', 'Vegetarian']}
                warnings={['High Sodium', 'Contains Preservatives']}
                variants={healthScoreVariants}
              />
            </div>

          </div>
        </div>

        {/* Fallback Display Layout for ultra-small mobile widths to show HealthScore below seamlessly */}
        <div className="block xs:hidden w-full max-w-[240px] mx-auto mt-[-10px] mb-4 relative z-30 scale-[0.85]">
          <HealthScore
            score={82}
            pros={['No Palm Oil', 'Natural Spices', 'Vegetarian']}
            warnings={['High Sodium', 'Contains Preservatives']}
            variants={healthScoreVariants}
          />
        </div>

        {/* Primary Interactive Landing Call-to-Actions */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4.5 }}
          className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 z-40 relative px-4"
        >
          <button className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all">
            Scan Your Product
          </button>
          <button className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200/80 transition-all">
            Learn More
          </button>
        </motion.div>

      </div>
    </section>
  );
};