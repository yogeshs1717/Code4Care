import type { ApiErrorPayload, OcrResult } from '../types/ocr';

/**
 * Dynamically resolves the API base URL.
 * When running locally or on a local network IP (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.x.x.x),
 * it prioritizes connecting to the local backend on port 8000.
 * When deployed on a public domain (e.g., Vercel), it uses VITE_API_BASE_URL or defaults to the Render backend.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    // Localhost
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Local Network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return `http://${host}:8000`;
    }
  }

  // Deployed environment (Vercel / Production)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    const firstUrl = envUrl.split(',')[0].trim();
    if (firstUrl) {
      return firstUrl.replace(/\/+$/, '');
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

/**
 * Compresses an image in the browser if it exceeds max size/resolution before uploading.
 * Reduces upload payload from ~10MB down to ~300KB for dramatic 10x-20x speedup.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size < 800 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1800;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })
            );
          }
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function requestOcr(image: File, signal?: AbortSignal): Promise<OcrResult> {
  // Compress image on client side before upload to prevent slow transfers / timeouts
  const processedFile = await compressImageIfNeeded(image);

  const body = new FormData();
  body.append('image', processedFile);

  const primaryBase = getApiBaseUrl();
  const urlsToTry: string[] = [primaryBase];

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const localNetworkUrl = `http://${window.location.hostname}:8000`;
    if (!urlsToTry.includes(localNetworkUrl)) urlsToTry.push(localNetworkUrl);
  }
  if (!urlsToTry.includes('http://localhost:8000')) urlsToTry.push('http://localhost:8000');
  if (!urlsToTry.includes('http://127.0.0.1:8000')) urlsToTry.push('http://127.0.0.1:8000');
  if (!urlsToTry.includes('https://code4care-fqhr.onrender.com')) urlsToTry.push('https://code4care-fqhr.onrender.com');
  if (!urlsToTry.includes('')) urlsToTry.push('');

  let lastApiError: OcrRequestError | null = null;

  for (const base of urlsToTry) {
    try {
      const url = base ? `${base}/ocr` : '/ocr';
      
      // Combine user cancellation signal with a 25-second per-attempt timeout
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 25000);
      
      const onParentAbort = () => timeoutController.abort();
      if (signal) signal.addEventListener('abort', onParentAbort);

      let response: Response;
      try {
        response = await fetch(url, { method: 'POST', body, signal: timeoutController.signal });
      } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onParentAbort);
      }

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
      if (signal?.aborted) throw cause;
      
      lastApiError = new OcrRequestError(
        'NETWORK_ERROR',
        `Could not reach server at ${base || 'relative'}.`
      );
    }
  }

  throw lastApiError || new OcrRequestError(
    'NETWORK_ERROR',
    `Could not reach server at ${primaryBase}. Check network or ensure backend is running.`
  );
}
