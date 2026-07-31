/**
 * Health Report types — for future use when the backend adds
 * POST /api/v1/analyze and POST /api/v1/gemma endpoints.
 *
 * Currently the backend only exposes POST /ocr.
 * These types are ready for when the pipeline is complete.
 */

export interface HealthScore {
  score: number;
  label: string;
  color: string;
}

export interface ProcessingLevel {
  id?: string;
  label: string;
  description: string;
  color?: string;
}

export interface PositiveIngredient {
  name: string;
  benefit: string;
}

export interface ConcernItem {
  name: string;
  concern: string;
  severity: string;
}

export interface AllergenInfo {
  name: string;
  triggered_by: string[];
}

export interface HealthConsideration {
  title: string;
  description: string;
  type: string;
}

export interface UnresolvedFallbackItem {
  name: string;
  inferred_category: string;
  note: string;
  risk_indicator: 'neutral' | 'positive' | 'concern';
}

export interface RecommendedAlternative {
  name: string;
  category: string;
  reason: string;
  estimated_score?: number;
  url?: string;
}

export interface DeterministicReport {
  product_name?: string;
  health_score: HealthScore;
  processing_level: ProcessingLevel;
  positive_ingredients: PositiveIngredient[];
  ingredients_of_concern: ConcernItem[];
  health_considerations: HealthConsideration[];
  allergens: AllergenInfo[];
  recommended_alternatives?: RecommendedAlternative[];
  unresolved_ingredients: string[];
  unresolved_heuristics?: UnresolvedFallbackItem[];
  ingredient_count?: number;
  resolved_count?: number;
}

export interface GemmaMessage {
  role: 'user' | 'assistant';
  content: string;
}
