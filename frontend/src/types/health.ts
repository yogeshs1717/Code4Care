/**
 * Health Report types — mirrors backend/models/health_report.py exactly.
 * Keep in sync whenever the backend model changes.
 */

export interface HealthScore {
  score: number;
  label: string;
  color: string;
}

export interface ProcessingLevel {
  label: string;
  description: string;
}

export interface PositiveIngredient {
  name: string;
  benefit: string;
}

export interface ConcernItem {
  name: string;
  concern: string;
  severity: 'low' | 'moderate' | 'high';
}

export interface AllergenInfo {
  name: string;
  triggered_by: string[];
}

export interface HealthConsideration {
  title: string;
  description: string;
  type: 'warning' | 'positive' | 'info';
}

/**
 * An ingredient resolved by Gemma when the deterministic dataset had no match.
 * `is_fallback_resolved` is always true — it distinguishes AI results from
 * rule-engine results in the UI.
 */
export interface GemmaResolvedIngredient {
  name: string;
  /** "positive" | "concerning" | "neutral" */
  category: 'positive' | 'concerning' | 'neutral';
  reason: string;
  is_fallback_resolved: true;
}

export interface DeterministicReport {
  product_name?: string | null;
  health_score: HealthScore;
  processing_level: ProcessingLevel;
  positive_ingredients: PositiveIngredient[];
  ingredients_of_concern: ConcernItem[];
  health_considerations: HealthConsideration[];
  allergens: AllergenInfo[];
  unresolved_ingredients: string[];
  /** Ingredients classified by Gemma as a fallback (not in the rule-engine dataset). */
  gemma_resolved_ingredients: GemmaResolvedIngredient[];
}

export interface GemmaMessage {
  role: 'user' | 'assistant';
  content: string;
}
