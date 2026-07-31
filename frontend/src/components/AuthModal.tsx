import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { requestOtp } from '../api/authClient';

type Step = 'email' | 'otp';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Title + subtitle shown above the auth form. */
  contextLabel?: string;
}

export function AuthModal({ open, onClose, contextLabel }: Props) {
  const { signInWithOtp } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep('email');
      setError(null);
      setInfo(null);
      setCode('');
    }
  }, [open]);

  if (!open) return null;

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await requestOtp(email);
      setStep('otp');
      setInfo(res.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithOtp(email, code);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">Sign in to Code4Care</p>
              <p className="text-[11px] text-stone-400">{contextLabel ?? 'Personalize your scans'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-stone-600">Email address</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-9 pr-3 text-sm text-stone-800 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 placeholder:text-stone-400"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <p className="text-xs text-stone-500">
                We emailed a 6-digit code to <span className="font-semibold text-stone-700">{email}</span>.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-stone-600">Verification code</span>
                <input
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-stone-800 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 placeholder:text-stone-300"
                />
              </label>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-xs font-medium text-amber-600 hover:text-amber-700"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {info && (
            <p className="mt-3 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-700">
              {info}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-[10px] leading-relaxed text-stone-400">
            Your health priorities stay on your account and are never shared.
            Code4Care is not medical advice.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
