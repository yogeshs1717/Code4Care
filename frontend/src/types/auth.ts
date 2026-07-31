/** Auth + personalization types — mirror backend/api/routes (auth, profile, history) and services/personalization. */

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string | null;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

export interface PriorityResult {
  key: string;
  label: string;
  matches: string[];
  /** "safe" | "flag" | "block" */
  level: 'safe' | 'flag' | 'block';
  message?: string | null;
}

export interface PersonalizationResult {
  enabled: boolean;
  priorities: PriorityResult[];
  blocked: boolean;
  block_message?: string | null;
  warnings: PriorityResult[];
}

export interface HealthProfile {
  priorities: string[];
  allergies: string[];
  settings?: Record<string, unknown>;
}

export interface ScanSummary {
  id: number;
  product_name?: string | null;
  score?: number | null;
  label?: string | null;
  scanned_at: string;
}

export interface ScanHistoryResponse {
  scans: ScanSummary[];
  total: number;
}
