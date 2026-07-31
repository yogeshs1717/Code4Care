import type {
  DeterministicReport,
  GemmaMessage,
} from '../types/health';
import { getApiBaseUrl } from './ocrClient';

async function fetchWithFallback(path: string, options: RequestInit): Promise<Response> {
  const urlsToTry: string[] = [];
  const primaryBase = getApiBaseUrl();
  if (primaryBase) urlsToTry.push(primaryBase);
  if (!urlsToTry.includes('')) urlsToTry.push('');
  if (!urlsToTry.includes('http://localhost:8000')) urlsToTry.push('http://localhost:8000');
  if (!urlsToTry.includes('http://127.0.0.1:8000')) urlsToTry.push('http://127.0.0.1:8000');

  let lastError: unknown = null;
  for (const base of urlsToTry) {
    try {
      const url = base ? `${base}${path}` : path;
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Could not reach backend server.');
}

export async function analyzeIngredients(
  ingredientText: string
): Promise<{ report: DeterministicReport }> {
  const response = await fetchWithFallback('/api/v1/analyze', {
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
  const response = await fetchWithFallback('/api/v1/gemma/explain', {
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
  const response = await fetchWithFallback('/api/v1/gemma/chat', {
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
