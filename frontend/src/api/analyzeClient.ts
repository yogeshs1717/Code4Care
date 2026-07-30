/**
 * Analyze API client — for future use when the backend adds
 * POST /api/v1/analyze and POST /api/v1/gemma/* endpoints.
 *
 * Currently the backend only exposes POST /ocr.
 * Ready to wire up when endpoints are available.
 */
import type {
  DeterministicReport,
  GemmaMessage,
} from '../types/health';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function analyzeIngredients(
  ingredientText: string
): Promise<{ report: DeterministicReport; ai_summary?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_text: ingredientText }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.error?.message ?? `Analysis failed (${response.status})`
    );
  }

  return response.json();
}

export async function explainReport(reportJson: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/gemma/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_json: reportJson }),
  });

  if (!response.ok) {
    throw new Error(`Gemma explain failed (${response.status})`);
  }

  const data = await response.json();
  return data.summary;
}

export async function chatWithGemma(
  reportJson: string,
  messages: GemmaMessage[],
  newMessage: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/gemma/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_json: reportJson,
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
