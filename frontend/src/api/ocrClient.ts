import type { ApiErrorPayload, OcrResult } from '../types/ocr';

/**
 * Dynamically resolves the API base URL.
 * If VITE_API_BASE_URL is set, it cleans it up (takes first URL if comma-separated, strips trailing slashes).
 * If unset or localhost when accessed over local network, it dynamically uses the current browser hostname on port 8000.
 */
export function getApiBaseUrl(): string {
  // If running in browser and accessed via a network IP (not localhost),
  // dynamically target port 8000 on that same hostname/IP.
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `http://${window.location.hostname}:8000`;
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    const firstUrl = envUrl.split(',')[0].trim();
    if (firstUrl) {
      return firstUrl.replace(/\/+$/, '');
    }
  }

  return 'http://localhost:8000';
}

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

  const baseUrl = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/ocr`, { method: 'POST', body, signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new OcrRequestError(
      'NETWORK_ERROR',
      `Could not reach server at ${baseUrl}. Check your connection and ensure the backend is running.`
    );
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
