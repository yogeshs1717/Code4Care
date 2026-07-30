'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface AnimatedPhoneProps {
  customVariants?: Variants;
  children?: React.ReactNode;
}

// Animation variant for the jar image appearing inside the camera viewport
const innerJarVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.7,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    scale: 0.8,
    filter: 'blur(0px)',
    transition: {
      delay: 2.2, // Waits for the phone sliding animation to finish
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const AnimatedPhone: React.FC<AnimatedPhoneProps> = ({ customVariants, children }) => {
  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      animate="visible"
      className="relative w-48 h-[360px] sm:w-56 sm:h-[420px] md:w-64 md:h-[480px] lg:w-72 lg:h-[520px] bg-slate-900 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-900/20 backdrop-blur-xl"
    >
      {/* Dynamic Island / Camera Notch */}
      <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-5 bg-black rounded-full z-30 flex items-center justify-end px-2 shadow-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ring-1 ring-slate-700" />
      </div>

      {/* Camera Screen Frame */}
      <div className="relative w-full h-full bg-slate-950 rounded-[36px] overflow-hidden flex flex-col justify-between border border-slate-800">
        
        {/* VIEWPORT CONTENT: JAR APPEARS ONLY WHEN PHONE STOPS IN POSITION */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-0">
          <motion.div
            variants={innerJarVariants}
            initial="hidden"
            animate="visible"
            className="translate-y-2 filter contrast-[1.05] brightness-105"
          >
            <svg
              viewBox="0 0 240 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-36 h-48 sm:w-44 sm:h-56 md:w-56 md:h-72"
            >
              <defs>
                <linearGradient id="phoneGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="phoneLidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#166534" />
                </linearGradient>
                <linearGradient id="phoneBrineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#eab308" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#854d0e" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="phoneLabelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
              </defs>

              {/* Jar Body */}
              <rect x="45" y="60" width="150" height="235" rx="24" fill="url(#phoneGlassGrad)" stroke="#ffffff" strokeWidth="2" />
              <rect x="50" y="90" width="140" height="198" rx="18" fill="url(#phoneBrineGrad)" />

              {/* Pickles Inside */}
              <ellipse cx="85" cy="140" rx="18" ry="32" fill="#15803d" transform="rotate(15 85 140)" />
              <ellipse cx="145" cy="170" rx="16" ry="35" fill="#166534" transform="rotate(-20 145 170)" />
              <ellipse cx="100" cy="220" rx="20" ry="38" fill="#14532d" transform="rotate(45 100 220)" />

              {/* Jar Lid & Neck */}
              <rect x="65" y="40" width="110" height="20" rx="4" fill="url(#phoneGlassGrad)" stroke="#ffffff" strokeWidth="1" />
              <rect x="60" y="20" width="120" height="24" rx="6" fill="url(#phoneLidGrad)" />

              {/* Front Label */}
              <rect x="60" y="110" width="120" height="130" rx="8" fill="url(#phoneLabelGrad)" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="68" y="120" width="104" height="18" rx="4" fill="#dcfce7" />
              <text x="120" y="132" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#166534">
                ORGANIC PICKLE
              </text>
              <text x="68" y="152" fontSize="7" fontWeight="bold" fill="#334155">INGREDIENTS:</text>
              <text x="68" y="165" fontSize="6" fill="#475569">• Mango, Spices, Oil</text>
              <text x="68" y="175" fontSize="6" fill="#475569">• Salt, Turmeric</text>
              <text x="68" y="185" fontSize="6" fill="#475569">• Sodium Benzoate</text>
            </svg>
          </motion.div>
        </div>

        {/* Viewfinder Grid Layer */}
        <div className="absolute inset-0 z-10 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />
        
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 z-10 pointer-events-none" />

        {/* Top Viewfinder UI Header */}
        <div className="relative z-20 pt-7 px-5 flex justify-between items-center text-white text-[11px] font-mono tracking-wider">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold">CAMERA VIEW</span>
          </div>
          <span className="bg-emerald-500/30 text-emerald-300 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-400/40 font-semibold text-[10px]">
            AI FOCUS
          </span>
        </div>

        {/* HUD Overlay scanner line */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          {children}
        </div>

        {/* Camera Shutter Bar */}
        <div className="relative z-20 pb-5 px-6 flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-[10px] font-bold">
            1.0x
          </div>

          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full border border-emerald-400/60 animate-ping" />
            <div className="w-11 h-11 rounded-full border-2 border-white p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-emerald-500 rounded-full" />
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs">
            ⚡
          </div>
        </div>
      </div>
    </motion.div>
  );
};