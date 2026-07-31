import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, HeartPulse, Clock } from 'lucide-react';
import { useAuth } from '../auth';
import { fetchScanHistory } from '../api/authClient';
import type { ScanSummary } from '../types/auth';

/** Editable subset of HealthProfile priorities + allergies + recent scans. */

const PRIORITY_OPTIONS: { key: string; label: string; desc: string }[] = [
  { key: 'diabetes', label: 'Diabetes', desc: 'Block very high sugar; warn on added sugar.' },
  { key: 'hypertension', label: 'High blood pressure', desc: 'Block very high sodium; warn on added salt.' },
  { key: 'heart', label: 'Heart health', desc: 'Block trans fats & palm oil; warn on saturated fat.' },
  { key: 'allergies', label: 'Allergies', desc: 'Hard-block any allergen you list.' },
];

const SUGGESTED_ALLERGIES = [
  'peanut', 'gluten', 'wheat', 'milk', 'dairy', 'egg', 'soy', 'sesame', 'tree nuts', 'shellfish', 'fish', 'sulfites',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HealthProfileModal({ open, onClose }: Props) {
  const { user, profile, token, saveProfile, signOut } = useAuth();
  const [priorities, setPriorities] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scans, setScans] = useState<ScanSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    setPriorities(profile?.priorities ?? []);
    setAllergies(profile?.allergies ?? []);
    setAllergyInput('');
    setError(null);
    if (token) {
      fetchScanHistory(token)
        .then((res) => setScans(res.scans))
        .catch(() => setScans([]));
    }
  }, [open, profile, token]);

  if (!open) return null;

  const togglePriority = (key: string) => {
    setPriorities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllergy = (a: string) => {
    setAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const addAllergy = () => {
    const v = allergyInput.trim().toLowerCase();
    if (!v) return;
    if (!allergies.includes(v)) setAllergies((prev) => [...prev, v]);
    setAllergyInput('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ priorities, allergies });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
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
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 shadow-sm">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">Your health profile</p>
              <p className="text-[11px] text-stone-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Priorities */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Health priorities
          </p>
          <div className="flex flex-col gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  priorities.includes(opt.key)
                    ? 'border-amber-300/70 bg-amber-50/70'
                    : 'border-stone-200/70 bg-stone-50/40 hover:bg-stone-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={priorities.includes(opt.key)}
                  onChange={() => togglePriority(opt.key)}
                  className="h-4 w-4 accent-amber-600"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-800">{opt.label}</p>
                  <p className="text-xs text-stone-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Allergies */}
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Personal allergies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_ALLERGIES.map((a) => {
              const on = allergies.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAllergy(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on
                      ? 'border-rose-300/70 bg-rose-50 text-rose-700'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {on ? '✓ ' : '+ '}{a}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
              placeholder="Add another allergen…"
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-sm text-stone-800 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              Add
            </button>
          </div>

          {/* Recent scans (memory) */}
          <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Clock className="h-3.5 w-3.5" /> Recent scans
          </p>
          {scans.length === 0 ? (
            <p className="text-xs text-stone-400">No scans yet. Your history will appear here.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {scans.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-stone-50/60 px-3 py-2 text-xs">
                  <span className="truncate text-stone-600">
                    {s.product_name ?? `Scan #${s.id}`}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-stone-500">
                    {s.score != null ? `${s.score}/100` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-stone-100 px-5 py-3">
          <button
            onClick={signOut}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            Sign out
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
