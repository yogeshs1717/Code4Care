import type { ApiErrorPayload, OcrResult } from '../types/ocr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class OcrRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OcrRequestError';
    this.code = code;
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as ApiErrorPayload).error;
  return typeof error?.code === 'string' && typeof error?.message === 'string';
}

export async function requestOcr(image: File, signal?: AbortSignal): Promise<OcrResult> {
  const body = new FormData();
  body.append('image', image);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ocr`, { method: 'POST', body, signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new OcrRequestError('NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorPayload(payload)) {
      throw new OcrRequestError(payload.error.code, payload.error.message);
    }
    throw new OcrRequestError('UNEXPECTED_ERROR', `Request failed (${response.status}).`);
  }

  return payload as OcrResult;
}
