import type { ApiErrorPayload, OcrResult } from '../types/ocr';

/**
 * Dynamically resolves the API base URL.
 * Checks VITE_API_BASE_URL first, then handles localhost/LAN IPs, and defaults to Render production backend.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    const firstUrl = envUrl.split(',')[0].trim();
    if (firstUrl) {
      return firstUrl.replace(/\/+$/, '');
    }
  }

  // Handle local development environments
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Match local LAN IPs (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return `http://${host}:8000`;
    }
  }

  return 'https://code4care-fqhr.onrender.com';
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

  // Strictly use the Render URL, no fallbacks
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/ocr`;

  try {
    const response = await fetch(url, { method: 'POST', body, signal });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (isApiErrorPayload(payload)) {
        throw new OcrRequestError(payload.error.code, payload.error.message);
      }
      throw new OcrRequestError('UNEXPECTED_ERROR', `Request failed (${response.status}).`);
    }

    return payload as OcrResult;
  } catch (cause) {
    if (cause instanceof OcrRequestError) throw cause;
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    
    // If Render is sleeping, it will throw a network error here. 
    throw new OcrRequestError(
      'NETWORK_ERROR',
      `Could not reach server at ${url}. If the backend just woke up, please try again in 30 seconds.`
    );
  }
}
