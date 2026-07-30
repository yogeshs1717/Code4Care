'use client';

import React from 'react';
import { HeroSection } from './HeroSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Modern Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-white font-black text-base shadow-md shadow-emerald-500/30">
              I
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Ingredient<span className="text-emerald-600">Intel</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How it Works</a>
            <a href="#about" className="hover:text-emerald-600 transition-colors">Safety Index</a>
          </nav>

          <button className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 border border-emerald-200/60 transition-all">
            Get App
          </button>
        </div>
      </header>

      <main>
        <HeroSection />
      </main>
    </div>
  );
};
