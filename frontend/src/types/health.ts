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

export interface DeterministicReport {
  product_name?: string;
  health_score: HealthScore;
  processing_level: ProcessingLevel;
  positive_ingredients: PositiveIngredient[];
  ingredients_of_concern: ConcernItem[];
  health_considerations: HealthConsideration[];
  allergens: AllergenInfo[];
  unresolved_ingredients: string[];
}

export interface GemmaMessage {
  role: 'user' | 'assistant';
  content: string;
}
