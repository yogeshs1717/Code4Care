import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, AuthUser, HealthProfile } from '../types/auth';
import {
  ApiRequestError,
  fetchHealthProfile,
  fetchMe,
  updateHealthProfile,
  verifyOtp,
} from '../api/authClient';

const TOKEN_KEY = 'c4c_access_token';
const USER_KEY = 'c4c_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  profile: HealthProfile | null;
  /** true until the stored token has been validated against the server. */
  initializing: boolean;
  signInWithOtp: (email: string, code: string) => Promise<AuthUser>;
  refreshProfile: () => Promise<HealthProfile>;
  saveProfile: (patch: Partial<HealthProfile>) => Promise<HealthProfile>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStoredSession, []);
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [initializing, setInitializing] = useState(Boolean(initial.token));

  // Validate a stored token against the server on first load. If it's expired,
  // silently sign out. Profile is only loaded for a valid session.
  useEffect(() => {
    if (!initial.token) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe(initial.token as string);
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(me));
        setUser(me);
        const prof = await fetchHealthProfile(initial.token as string);
        if (cancelled) return;
        setProfile(prof);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((session: AuthSession) => {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setToken(session.access_token);
    setUser(session.user);
  }, []);

  const signInWithOtp = useCallback(
    async (email: string, code: string) => {
      const session = await verifyOtp(email, code);
      persist(session);
      try {
        setProfile(await fetchHealthProfile(session.access_token));
      } catch {
        setProfile(null);
      }
      return session.user;
    },
    [persist]
  );

  const refreshProfile = useCallback(async () => {
    if (!token) throw new ApiRequestError('UNAUTHORIZED', 'Not signed in.', 401);
    const prof = await fetchHealthProfile(token);
    setProfile(prof);
    return prof;
  }, [token]);

  const saveProfile = useCallback(
    async (patch: Partial<HealthProfile>) => {
      if (!token) throw new ApiRequestError('UNAUTHORIZED', 'Not signed in.', 401);
      const updated = await updateHealthProfile(token, patch);
      setProfile(updated);
      return updated;
    },
    [token]
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      profile,
      initializing,
      signInWithOtp,
      refreshProfile,
      saveProfile,
      signOut,
    }),
    [user, token, profile, initializing, signInWithOtp, refreshProfile, saveProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
