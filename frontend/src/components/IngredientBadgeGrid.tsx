import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type {
  ConcernItem,
  GemmaResolvedIngredient,
  PositiveIngredient,
} from '../types/health';

// ── Tier definitions ─────────────────────────────────────────────────────────

type Tier = 'positive' | 'concerning-high' | 'concerning-moderate' | 'concerning-low' | 'neutral' | 'gemma';

interface BadgeProps {
  label: string;
  sublabel?: string;
  tier: Tier;
  delay?: number;
  /** Show the Gemma Sparkles icon */
  isGemma?: boolean;
}

const TIER_STYLES: Record<Tier, string> = {
  'positive':            'bg-emerald-50  border-emerald-200  text-emerald-800',
  'concerning-high':     'bg-rose-50     border-rose-300     text-rose-800',
  'concerning-moderate': 'bg-rose-50     border-rose-200     text-rose-700',
  'concerning-low':      'bg-amber-50    border-amber-200    text-amber-800',
  'neutral':             'bg-slate-100   border-slate-200    text-slate-700',
  'gemma':               'bg-blue-50     border-blue-200     text-blue-700',
};

const SEVERITY_DOT: Record<string, string> = {
  high:     'bg-rose-500',
  moderate: 'bg-amber-500',
  low:      'bg-amber-300',
};

// ── Single pill ──────────────────────────────────────────────────────────────

function IngredientPill({ label, sublabel, tier, delay = 0, isGemma = false }: BadgeProps) {
  return (
    <motion.span
      className={`
        inline-flex items-center gap-1 rounded-full border px-2.5 py-1
        text-xs font-medium leading-none
        ${TIER_STYLES[tier]}
      `}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
      title={sublabel}
    >
      {isGemma && <Sparkles className="h-3 w-3 shrink-0 opacity-80" />}
      {tier.startsWith('concerning') && !isGemma && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[tier.split('-')[1]] ?? SEVERITY_DOT.low}`} />
      )}
      {label}
    </motion.span>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function BadgeSection({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      className="flex flex-col gap-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368]">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </motion.div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

interface IngredientBadgeGridProps {
  positives: PositiveIngredient[];
  concerns: ConcernItem[];
  gemmaResolved?: GemmaResolvedIngredient[];
  /** Starting animation delay in seconds */
  baseDelay?: number;
}

export function IngredientBadgeGrid({
  positives,
  concerns,
  gemmaResolved = [],
  baseDelay = 0,
}: IngredientBadgeGridProps) {
  const hasPositives     = positives.length > 0;
  const hasConcerns      = concerns.length > 0;
  const hasGemmaResolved = gemmaResolved.length > 0;

  if (!hasPositives && !hasConcerns && !hasGemmaResolved) {
    return null;
  }

  // Split Gemma-resolved into the same positive / concerning / neutral buckets
  const gemmaPositive    = gemmaResolved.filter((g) => g.category === 'positive');
  const gemmaConcerning  = gemmaResolved.filter((g) => g.category === 'concerning');
  const gemmaNeutral     = gemmaResolved.filter((g) => g.category === 'neutral');

  let sectionIndex = 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Deterministic positive ingredients ── */}
      {hasPositives && (
        <BadgeSection title="Positive Ingredients" delay={baseDelay + sectionIndex++ * 0.08}>
          {positives.map((item, i) => (
            <IngredientPill
              key={item.name}
              label={item.name}
              sublabel={item.benefit}
              tier="positive"
              delay={baseDelay + i * 0.04}
            />
          ))}
          {/* Gemma-positive fallbacks rendered in the same section */}
          {gemmaPositive.map((item, i) => (
            <IngredientPill
              key={`gp-${item.name}`}
              label={item.name}
              sublabel={item.reason}
              tier="gemma"
              delay={baseDelay + (positives.length + i) * 0.04}
              isGemma
            />
          ))}
        </BadgeSection>
      )}

      {/* Gemma-positive section when there are no deterministic positives */}
      {!hasPositives && gemmaPositive.length > 0 && (
        <BadgeSection title="Positive Ingredients" delay={baseDelay + sectionIndex++ * 0.08}>
          {gemmaPositive.map((item, i) => (
            <IngredientPill
              key={`gp-${item.name}`}
              label={item.name}
              sublabel={item.reason}
              tier="gemma"
              delay={baseDelay + i * 0.04}
              isGemma
            />
          ))}
        </BadgeSection>
      )}

      {/* ── Deterministic concerns ── */}
      {hasConcerns && (
        <BadgeSection title="Ingredients of Concern" delay={baseDelay + sectionIndex++ * 0.08}>
          {concerns.map((item, i) => (
            <IngredientPill
              key={item.name}
              label={item.name}
              sublabel={`${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} · ${item.concern}`}
              tier={`concerning-${item.severity}` as Tier}
              delay={baseDelay + i * 0.04}
            />
          ))}
          {/* Gemma-concerning fallbacks */}
          {gemmaConcerning.map((item, i) => (
            <IngredientPill
              key={`gc-${item.name}`}
              label={item.name}
              sublabel={item.reason}
              tier="gemma"
              delay={baseDelay + (concerns.length + i) * 0.04}
              isGemma
            />
          ))}
        </BadgeSection>
      )}

      {/* Gemma-concerning when no deterministic concerns */}
      {!hasConcerns && gemmaConcerning.length > 0 && (
        <BadgeSection title="Ingredients of Concern" delay={baseDelay + sectionIndex++ * 0.08}>
          {gemmaConcerning.map((item, i) => (
            <IngredientPill
              key={`gc-${item.name}`}
              label={item.name}
              sublabel={item.reason}
              tier="gemma"
              delay={baseDelay + i * 0.04}
              isGemma
            />
          ))}
        </BadgeSection>
      )}

      {/* ── Gemma neutral fallbacks ── */}
      {gemmaNeutral.length > 0 && (
        <BadgeSection title="Other Identified Ingredients" delay={baseDelay + sectionIndex++ * 0.08}>
          {gemmaNeutral.map((item, i) => (
            <IngredientPill
              key={`gn-${item.name}`}
              label={item.name}
              sublabel={item.reason}
              tier="gemma"
              delay={baseDelay + i * 0.04}
              isGemma
            />
          ))}
        </BadgeSection>
      )}

      {/* ── Gemma attribution note ── */}
      {hasGemmaResolved && (
        <motion.p
          className="flex items-center gap-1.5 text-[11px] text-[#5f6368]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.6 }}
        >
          <Sparkles className="h-3 w-3 text-[#4285F4]" />
          Pills marked with{' '}
          <Sparkles className="inline h-3 w-3 text-[#4285F4]" />{' '}
          were classified by Gemma AI as a fallback.
        </motion.p>
      )}
    </div>
  );
}
