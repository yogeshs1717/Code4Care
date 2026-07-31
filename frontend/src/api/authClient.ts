/**
 * Auth + personalization API client.
 * The JWT is supplied by the AuthContext; attach it to authenticated requests.
 */
import type {
  AuthSession,
  AuthUser,
  HealthProfile,
  ScanHistoryResponse,
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

function isApiErrorPayload(value: unknown): value is { error: { code: string; message: string } } {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as { error?: { code?: unknown; message?: unknown } }).error;
  return typeof error?.code === 'string' && typeof error?.message === 'string';
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', 'Could not reach the server. Check your connection.', 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorPayload(payload)) {
      throw new ApiRequestError(payload.error.code, payload.error.message, response.status);
    }
    throw new ApiRequestError('UNEXPECTED_ERROR', `Request failed (${response.status}).`, response.status);
  }

  return payload as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function requestOtp(email: string): Promise<{ sent: boolean; message: string }> {
  return request('/api/v1/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, code: string): Promise<AuthSession> {
  return request('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function fetchMe(token: string): Promise<AuthUser> {
  return request('/api/v1/auth/me', {}, token);
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function fetchHealthProfile(token: string): Promise<HealthProfile> {
  return request('/api/v1/profile/health', {}, token);
}

export function updateHealthProfile(
  token: string,
  profile: Partial<HealthProfile>
): Promise<HealthProfile> {
  return request('/api/v1/profile/health', {
    method: 'PUT',
    body: JSON.stringify(profile),
  }, token);
}

// ── History (scan memory) ─────────────────────────────────────────────────────

export function fetchScanHistory(token: string): Promise<ScanHistoryResponse> {
  return request('/api/v1/history/scans', {}, token);
}
