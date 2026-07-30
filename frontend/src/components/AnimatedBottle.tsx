'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface AnimatedBottleProps {
  customVariants?: Variants;
}

export const AnimatedBottle: React.FC<AnimatedBottleProps> = ({ customVariants }) => {
  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      animate="visible"
      className="relative w-44 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80 lg:w-72 lg:h-96 flex items-center justify-center filter drop-shadow-2xl"
    >
      <svg
        viewBox="0 0 240 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Glass Jar Gradient */}
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
          </linearGradient>

          {/* Lid Gradient */}
          <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Liquid/Pickle Oil Fill */}
          <linearGradient id="brineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#854d0e" stopOpacity="0.85" />
          </linearGradient>

          {/* Label Gradient */}
          <linearGradient id="labelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>

        {/* Jar Shadow Base */}
        <ellipse cx="120" cy="305" rx="75" ry="10" fill="#000000" fillOpacity="0.15" />

        {/* Outer Glass Body */}
        <rect
          x="45"
          y="60"
          width="150"
          height="235"
          rx="24"
          fill="url(#glassGrad)"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Liquid Inside */}
        <rect
          x="50"
          y="90"
          width="140"
          height="198"
          rx="18"
          fill="url(#brineGrad)"
        />

        {/* Pickle Details Inside Jar */}
        <ellipse cx="85" cy="140" rx="18" ry="32" fill="#15803d" transform="rotate(15 85 140)" />
        <ellipse cx="145" cy="170" rx="16" ry="35" fill="#166534" transform="rotate(-20 145 170)" />
        <ellipse cx="100" cy="220" rx="20" ry="38" fill="#14532d" transform="rotate(45 100 220)" />
        {/* Chili Flakes / Spices */}
        <circle cx="75" cy="190" r="3" fill="#dc2626" />
        <circle cx="125" cy="130" r="4" fill="#dc2626" />
        <circle cx="160" cy="230" r="3" fill="#ef4444" />
        <circle cx="110" cy="260" r="2.5" fill="#f59e0b" />

        {/* Glass Reflection Highlight */}
        <path
          d="M 55 75 Q 55 285 55 285 Q 70 285 70 75 Z"
          fill="#ffffff"
          fillOpacity="0.4"
        />

        {/* Jar Neck */}
        <rect x="65" y="40" width="110" height="20" rx="4" fill="url(#glassGrad)" stroke="#ffffff" strokeWidth="1" />

        {/* Metallic Green Lid */}
        <rect x="60" y="20" width="120" height="24" rx="6" fill="url(#lidGrad)" />
        <line x1="60" y1="28" x2="180" y2="28" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />

        {/* Ingredient Label (Front Facing) */}
        <g id="ingredient-label">
          <rect
            x="60"
            y="110"
            width="120"
            height="130"
            rx="8"
            fill="url(#labelGrad)"
            stroke="#cbd5e1"
            strokeWidth="1"
            className="shadow-sm"
          />
          {/* Label Header */}
          <rect x="68" y="120" width="104" height="18" rx="4" fill="#dcfce7" />
          <text x="120" y="132" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#166534">
            ORGANIC PICKLE
          </text>

          {/* Micro Ingredient Text Lines */}
          <text x="68" y="152" fontSize="7" fontWeight="bold" fill="#334155">INGREDIENTS:</text>
          <text x="68" y="165" fontSize="6" fill="#475569">• Mango, Spices, Oil</text>
          <text x="68" y="175" fontSize="6" fill="#475569">• Salt, Turmeric</text>
          <text x="68" y="185" fontSize="6" fill="#475569">• Sodium Benzoate</text>
          <text x="68" y="195" fontSize="6" fill="#475569">• Artificial Colour</text>

          {/* Barcode Graphic */}
          <rect x="68" y="210" width="104" height="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
          <path d="M 74 213 V 227 M 77 213 V 227 M 82 213 V 227 M 84 213 V 227 M 88 213 V 227 M 94 213 V 227 M 98 213 V 227 M 104 213 V 227 M 110 213 V 227 M 115 213 V 227 M 120 213 V 227 M 126 213 V 227 M 130 213 V 227 M 136 213 V 227 M 142 213 V 227 M 148 213 V 227 M 154 213 V 227 M 160 213 V 227" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      </svg>
    </motion.div>
  );
};