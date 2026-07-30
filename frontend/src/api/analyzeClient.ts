/**
 * Analyze & Gemma API client — calls the real backend endpoints.
 *
 * POST /api/v1/analyze     → deterministic health report
 * POST /api/v1/gemma/explain → AI summary of the report
 * POST /api/v1/gemma/chat    → multi-turn Q&A about the product
 */
import type {
  DeterministicReport,
  GemmaMessage,
} from '../types/health';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function analyzeIngredients(
  ingredientText: string
): Promise<{ report: DeterministicReport }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_text: ingredientText }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.detail?.message ?? payload?.detail ?? `Analysis failed (${response.status})`
    );
  }

  return response.json();
}

export async function explainReport(ingredientText: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/gemma/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_text: ingredientText }),
  });

  if (!response.ok) {
    throw new Error(`Gemma explain failed (${response.status})`);
  }

  const data = await response.json();
  return data.summary;
}

export async function chatWithGemma(
  ingredientText: string,
  messages: GemmaMessage[],
  newMessage: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/gemma/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredient_text: ingredientText,
      messages,
      new_message: newMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemma chat failed (${response.status})`);
  }

  const data = await response.json();
  return data.reply;
}
