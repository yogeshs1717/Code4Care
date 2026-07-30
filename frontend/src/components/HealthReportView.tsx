import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  CheckCircle,
  Sparkles,
  Zap,
  Wheat,
  Milk,
  Nut,
  Egg,
} from 'lucide-react';
import type { DeterministicReport } from '../types/health';

interface HealthReportViewProps {
  report: DeterministicReport | null;
  aiSummary?: string | null;
}

export function HealthReportView({
  report,
  aiSummary,
}: HealthReportViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'concerns' | 'positives' | 'heuristics'>('all');

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center font-sans">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 animate-pulse">
          <Zap className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Loading Graphic Infographics...</h2>
        <p className="text-xs font-semibold text-slate-500">Preparing visual food graphics</p>
      </div>
    );
  }

  const {
    health_score,
    processing_level,
    positive_ingredients,
    ingredients_of_concern,
    allergens,
    unresolved_ingredients,
    unresolved_heuristics,
    ingredient_count,
    resolved_count,
  } = report;

  const totalEvaluated = resolved_count || ingredient_count || 1;
  const positiveCount = positive_ingredients.length;
  const concernCount = ingredients_of_concern.length;
  const allergenCount = allergens.length;

  // Percentages for visual stacked bar
  const posPct = Math.round((positiveCount / totalEvaluated) * 100);
  const conPct = Math.round((concernCount / totalEvaluated) * 100);
  const neuPct = Math.max(0, 100 - posPct - conPct);

  const isGood = health_score.score >= 60;
  const badgeImg = isGood ? '/images/badge_good.png' : '/images/badge_warning.png';

  const getAllergenIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('milk') || n.includes('dairy') || n.includes('lactose')) return <Milk className="h-4 w-4 text-amber-600" />;
    if (n.includes('wheat') || n.includes('gluten')) return <Wheat className="h-4 w-4 text-amber-600" />;
    if (n.includes('nut') || n.includes('peanut')) return <Nut className="h-4 w-4 text-amber-600" />;
    if (n.includes('egg')) return <Egg className="h-4 w-4 text-amber-600" />;
    return <ShieldAlert className="h-4 w-4 text-amber-600" />;
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-3 sm:px-6 max-w-lg mx-auto w-full font-sans text-slate-900">
      {/* ── 1. Visual 3D Hero Badge Stamp Card ── */}
      <motion.div
        className="relative overflow-hidden rounded-3xl border-3 border-slate-900 bg-white p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* 3D Generated Rating Badge */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-900 bg-amber-50 p-1 shadow-sm">
              <img
                src={badgeImg}
                alt="Health Rating Badge"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-4xl font-black tracking-tight"
                  style={{ color: health_score.color }}
                >
                  {health_score.score}
                </span>
                <span className="text-xs font-black uppercase text-slate-400">/100</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {health_score.label} Choice
              </h2>
              <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 border border-slate-300">
                {processing_level.label}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span
              className="rounded-2xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-md"
              style={{ backgroundColor: health_score.color }}
            >
              {health_score.score >= 80 ? '🟢 Excellent' : health_score.score >= 60 ? '🔵 Good' : health_score.score >= 40 ? '🟡 Moderate' : '🔴 High Risk'}
            </span>
          </div>
        </div>

        {/* ── 2. Visual Safety Breakdown Bar ── */}
        <div className="mt-4 pt-4 border-t-2 border-slate-100">
          <div className="flex justify-between text-[11px] font-black uppercase text-slate-500 mb-1.5">
            <span>Safety Composition</span>
            <span>{totalEvaluated} Items Evaluated</span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 p-0.5 gap-0.5">
            {posPct > 0 && (
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${posPct}%` }}
              />
            )}
            {neuPct > 0 && (
              <div
                className="h-full rounded-full bg-slate-300 transition-all"
                style={{ width: `${neuPct}%` }}
              />
            )}
            {conPct > 0 && (
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{ width: `${conPct}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] font-black text-slate-600 mt-2 px-1">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {posPct}% Clean</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> {neuPct}% Neutral</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {conPct}% Risk</span>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Visual 3D Healthy vs Junk Comparison Banner ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Healthy Graphic Box */}
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 shadow-xs">
          <img src="/images/food_healthy.png" alt="Healthy Food" className="h-12 w-12 object-contain shrink-0 rounded-xl" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-emerald-700">Clean Food</span>
            <p className="text-sm font-black text-emerald-950">{positiveCount} Goods</p>
          </div>
        </div>

        {/* Processed Junk Graphic Box */}
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 shadow-xs">
          <img src="/images/food_processed.png" alt="Processed Food" className="h-12 w-12 object-contain shrink-0 rounded-xl" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-rose-700">Additives</span>
            <p className="text-sm font-black text-rose-950">{concernCount} Flags</p>
          </div>
        </div>
      </div>

      {/* ── 4. Visual 3D Allergen Shield Card ── */}
      {allergenCount > 0 && (
        <div className="flex items-center gap-3.5 rounded-2xl border-2 border-amber-400 bg-amber-50 p-3.5 shadow-sm">
          <img src="/images/allergen_shield.png" alt="Allergen Shield" className="h-14 w-14 object-contain shrink-0 rounded-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-black text-amber-950 text-xs mb-1">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>ALLERGEN SHIELD ({allergenCount})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergens.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-2.5 py-1 text-xs font-black text-amber-950"
                >
                  {getAllergenIcon(a.name)}
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Visual 3D Health Swap Suggestion Feature ── */}
      <div className="flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3.5 text-emerald-950 shadow-sm">
        <img src="/images/swap_fruit.png" alt="Fruit Swap" className="h-14 w-14 object-contain shrink-0 rounded-xl" />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
            Smart Health Swap Idea
          </span>
          <p className="text-xs font-extrabold text-emerald-950 truncate">
            {health_score.score >= 70
              ? '🍏 Excellent choice! Pair with fresh organic fruits.'
              : '🍇 Swap for fresh berries, nuts, or organic fruits!'}
          </p>
        </div>
      </div>

      {/* ── 6. Gemma AI Quick Badge ── */}
      {aiSummary && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-3 text-xs font-black text-indigo-950">
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
          <p className="line-clamp-2 leading-snug">
            {aiSummary}
          </p>
        </div>
      )}

      {/* ── 7. Visual Filter Chips ── */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-200 p-1 font-extrabold text-xs">
        {[
          { id: 'all', label: `All (${totalEvaluated})` },
          { id: 'concerns', label: `🔴 Risk (${concernCount})` },
          { id: 'positives', label: `🟢 Clean (${positiveCount})` },
          { id: 'heuristics', label: `🔍 Unlisted (${unresolved_heuristics?.length || unresolved_ingredients.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`flex-1 rounded-xl py-2 px-1 text-[11px] font-black transition-all ${
              activeFilter === tab.id
                ? 'bg-white text-slate-900 shadow-sm border-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 8. Visual Micro-Badges Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Risk Items */}
        {(activeFilter === 'all' || activeFilter === 'concerns') &&
          ingredients_of_concern.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white font-black text-[10px]">
                  🚨
                </div>
                <span className="font-extrabold text-slate-900 truncate">{item.name}</span>
              </div>
              <span className="shrink-0 rounded bg-rose-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-900">
                {item.severity}
              </span>
            </div>
          ))}

        {/* Clean / Positive Items */}
        {(activeFilter === 'all' || activeFilter === 'positives') &&
          positive_ingredients.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-xs min-w-0"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-black text-[10px]">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
              <span className="font-extrabold text-slate-900 truncate">{item.name}</span>
            </div>
          ))}

        {/* Unlisted Fallback Chips */}
        {(activeFilter === 'all' || activeFilter === 'heuristics') &&
          unresolved_heuristics &&
          unresolved_heuristics.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3 text-xs"
            >
              <span className="font-extrabold text-slate-900 truncate">{item.name}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                  item.risk_indicator === 'positive'
                    ? 'bg-emerald-200 text-emerald-900'
                    : item.risk_indicator === 'concern'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {item.inferred_category}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
