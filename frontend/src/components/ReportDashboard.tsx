import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  AlertTriangle, Sparkles, Bot, Send, ShieldCheck,
  Leaf, MessageCircle, X, TrendingUp, BarChart3,
  ChevronDown, ChevronUp, Scan,
} from 'lucide-react';
import type { DeterministicReport, GemmaMessage } from '../types/health';
import type { PersonalizationResult, PriorityResult } from '../types/auth';
import { chatWithGemma } from '../api/analyzeClient';
import { ResponsiveScoreGlobe } from './ScoreGlobe';

interface Props {
  report: DeterministicReport | null;
  aiSummary?: string | null;
  personalization?: PersonalizationResult | null;
  onHome?: () => void;
  onNewScan?: () => void;
  onOpenProfile?: () => void;
}

function Reveal({ delay, children, className = '' }: {
  delay: number; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-amber-200/30 bg-white/80 backdrop-blur-sm shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-amber-600/40">{icon}</span>}
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">{children}</p>
    </div>
  );
}

function verdict(score: number) {
  if (score >= 72) return { text: 'Safe to Consume', emoji: '🛡️', bg: 'bg-emerald-100/60 border-emerald-300/40', fg: 'text-emerald-800' };
  if (score >= 50) return { text: 'Consume in Moderation', emoji: '⚖️', bg: 'bg-amber-100/60 border-amber-300/40', fg: 'text-amber-800' };
  if (score >= 30) return { text: 'Proceed with Caution', emoji: '⚠️', bg: 'bg-orange-100/60 border-orange-300/40', fg: 'text-orange-800' };
  return { text: 'Avoid if Possible', emoji: '🚫', bg: 'bg-rose-100/60 border-rose-300/40', fg: 'text-rose-800' };
}

function ScoreBar({ label, value, max, color, icon, delay = 0 }: {
  label: string; value: number; max: number; color: string; icon?: React.ReactNode; delay?: number;
}) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-stone-600">
          {icon && <span className="shrink-0">{icon}</span>}{label}
        </span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </div>
  );
}

function Pill({ children, variant }: {
  children: React.ReactNode;
  variant: 'positive' | 'concern-high' | 'concern-moderate' | 'concern-low' | 'neutral' | 'gemma';
}) {
  const styles = {
    'positive': 'bg-emerald-100/70 border-emerald-300/50 text-emerald-800',
    'concern-high': 'bg-rose-100/70 border-rose-300/50 text-rose-800',
    'concern-moderate': 'bg-rose-100/70 border-rose-300/50 text-rose-700',
    'concern-low': 'bg-amber-100/70 border-amber-300/50 text-amber-800',
    'neutral': 'bg-stone-100/70 border-stone-200/50 text-stone-600',
    'gemma': 'bg-amber-100/70 border-amber-300/50 text-amber-800',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      {variant === 'gemma' && <Sparkles className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

function ChatPanel({ reportJson, onClose }: { reportJson: string; onClose: () => void }) {
  const [messages, setMessages] = useState<GemmaMessage[]>([
    { role: 'assistant', content: 'Ask me anything about the ingredients in this product.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    if (!input.trim() || busy) return;
    const msg: GemmaMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, msg]);
    setInput('');
    setBusy(true);
    try {
      const reply = await chatWithGemma(reportJson, [...messages, msg], msg.content);
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Sorry, I couldn't reach Gemma right now." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [input, busy, messages, reportJson]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-lg rounded-2xl bg-white border border-stone-200/60 shadow-2xl overflow-hidden"
        initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-500 shadow-sm">
              <Bot className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold text-stone-800">Ask Gemma</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-500 mt-0.5 shadow-sm">
                    <Bot className="h-3.5 w-3.5 text-white" /></div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-sm' : 'bg-stone-100/80 text-stone-700'
                }`}>{m.content}</div>
              </motion.div>
            ))}
            {busy && (
              <motion.div className="flex gap-2 justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-500 shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" /></div>
                <div className="flex items-center gap-1 rounded-2xl bg-stone-100/80 px-3.5 py-2.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t border-stone-100 p-3">
          <input className="flex-1 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50 transition-all placeholder:text-stone-400"
            placeholder="Ask about an ingredient…" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && send()} disabled={busy} />
          <motion.button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-sm disabled:opacity-40"
            onClick={send} disabled={!input.trim() || busy}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConcernCard({ concern, index }: { concern: { name: string; severity: string; concern: string }; index: number }) {
  const [open, setOpen] = useState(index < 2);
  return (
    <motion.div
      className={`rounded-xl border overflow-hidden transition-colors ${
        concern.severity === 'high' ? 'border-rose-200/60 bg-rose-50/50' :
        concern.severity === 'moderate' ? 'border-amber-200/60 bg-amber-50/50' :
        'border-stone-200/50 bg-stone-50/30'
      }`}
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.24 + index * 0.06 }}>
      <button className="flex w-full items-center gap-2.5 p-3 text-left" onClick={() => setOpen(!open)}>
        <AlertTriangle className={`h-4 w-4 shrink-0 ${
          concern.severity === 'high' ? 'text-rose-500' :
          concern.severity === 'moderate' ? 'text-amber-600' : 'text-stone-400'
        }`} />
        <span className="flex-1 text-sm font-semibold text-stone-800">{concern.name}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
          concern.severity === 'high' ? 'text-rose-500' :
          concern.severity === 'moderate' ? 'text-amber-600' : 'text-stone-400'
        }`}>{concern.severity}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="px-3 pb-3 pt-0" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p className="text-xs text-stone-500 leading-relaxed">{concern.concern}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PersonalizationWarnings({ personalization }: { personalization: PersonalizationResult }) {
  const flags = personalization.warnings.filter((w) => w.matches.length > 0);
  if (flags.length === 0) return null;
  return (
    <Reveal delay={0.06}>
      <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50/90 to-white p-4">
        <SectionLabel icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          Personalized warnings
        </SectionLabel>
        <div className="flex flex-col gap-2">
          {flags.map((f: PriorityResult) => (
            <div key={f.key} className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-800">{f.label}</p>
                <p className="text-xs text-amber-700/70">{f.message}</p>
                <p className="mt-0.5 text-[11px] text-amber-600/80">
                  Found: {f.matches.slice(0, 5).join(', ')}
                  {f.matches.length > 5 ? '…' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function BlockedVerdict({ personalization, onNewScan, onOpenProfile }: {
  personalization: PersonalizationResult;
  onNewScan?: () => void;
  onOpenProfile?: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <motion.div
        className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-rose-400/40 bg-rose-50"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-rose-400/20"
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-5xl">🚫</span>
      </motion.div>

      <motion.h2
        className="mt-6 text-2xl font-extrabold text-stone-800"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Not for you
      </motion.h2>

      <motion.p
        className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        {personalization.block_message}
      </motion.p>

      <motion.div
        className="mt-4 flex max-w-md flex-col gap-2 text-left"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {personalization.priorities
          .filter((p) => p.level === 'block')
          .map((p) => (
            <div key={p.key} className="flex items-start gap-2 rounded-xl border border-rose-200/60 bg-rose-50/70 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-800">{p.label}</p>
                <p className="text-xs text-rose-700/70">
                  Found: {p.matches.slice(0, 5).join(', ')}
                  {p.matches.length > 5 ? '…' : ''}
                </p>
              </div>
            </div>
          ))}
      </motion.div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <motion.button
          className="rounded-xl border border-stone-200/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-white"
          onClick={onNewScan}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Scan another food
        </motion.button>
        {onOpenProfile && (
          <motion.button
            className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20"
            onClick={onOpenProfile}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Adjust my priorities
          </motion.button>
        )}
      </div>
    </div>
  );
}

function RealReport({ report, aiSummary, personalization, onHome, onNewScan, onOpenProfile }: {
  report: DeterministicReport;
  aiSummary?: string | null;
  personalization?: PersonalizationResult | null;
  onHome?: () => void;
  onNewScan?: () => void;
  onOpenProfile?: () => void;
}) {
  // Hard block: the user's priorities are non-negotiably violated. Render only
  // the block screen — the full report stays hidden.
  if (personalization?.blocked) {
    return <BlockedVerdict personalization={personalization} onNewScan={onNewScan} onOpenProfile={onOpenProfile} />;
  }

  const score = report.health_score.score;
  const color = report.health_score.color;
  const label = report.health_score.label;
  const v = verdict(score);
  const reportJson = useMemo(() => JSON.stringify(report), [report]);
  const [chatOpen, setChatOpen] = useState(false);

  const procColor = report.processing_level.label === 'Ultra-processed' ? 'text-rose-700' :
    report.processing_level.label === 'Processed' ? 'text-amber-700' : 'text-emerald-700';
  const procBg = report.processing_level.label === 'Ultra-processed' ? 'bg-rose-50/80 border-rose-200/50' :
    report.processing_level.label === 'Processed' ? 'bg-amber-50/80 border-amber-200/50' :
    'bg-emerald-50/80 border-emerald-200/50';

  const highCount = report.ingredients_of_concern.filter(c => c.severity === 'high').length;
  const modCount = report.ingredients_of_concern.filter(c => c.severity === 'moderate').length;
  const lowCount = report.ingredients_of_concern.filter(c => c.severity === 'low').length;
  const posCount = report.positive_ingredients.length;

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <header className="sticky top-0 z-30 border-b border-amber-200/30 bg-[#f8f5f0]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20">
              <Scan className="h-4 w-4 text-white" />
            </div>
            <motion.h1 className="text-lg font-bold text-stone-800"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              Health Report
            </motion.h1>
          </div>
          <div className="flex items-center gap-2">
            {onHome && (
              <motion.button className="text-xs text-stone-500 hover:text-amber-600 px-2 py-1 transition-colors"
                onClick={onHome} whileHover={{ x: -2 }}>← Home</motion.button>
            )}
            {onNewScan && (
              <motion.button className="rounded-lg border border-stone-200/50 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-white hover:border-stone-300/50 transition-all"
                onClick={onNewScan} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                New Scan
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <div className="fixed top-1/4 -left-32 w-96 h-96 rounded-full bg-amber-200/20 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-80 h-80 rounded-full bg-amber-300/15 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Reveal delay={0.05}>
              <Card className="p-5 text-center">
                <div className="flex flex-col items-center gap-3">
                  <ResponsiveScoreGlobe score={score} color={color} />
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-bold ${v.bg} ${v.fg}`}>
                      <span>{v.emoji}</span><span>{v.text}</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color }}>{label}</p>
                  </div>
                </div>
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card className={`px-4 py-3.5 border ${procBg}`}>
                <div className="flex items-center gap-2">
                  <Leaf className={`h-4 w-4 shrink-0 ${procColor}`} />
                  <div>
                    <span className={`text-sm font-semibold ${procColor}`}>{report.processing_level.label}</span>
                    <p className="text-xs text-stone-500 mt-0.5">{report.processing_level.description}</p>
                  </div>
                </div>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="p-4">
                <SectionLabel icon={<BarChart3 className="h-3.5 w-3.5" />}>At a Glance</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-stone-50/60 p-3 text-center">
                    <p className="text-2xl font-bold text-stone-700">{report.ingredients_of_concern.length}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Concerns</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{posCount}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Positives</p>
                  </div>
                  <div className="rounded-xl bg-amber-50/60 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{report.allergens.length}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Allergens</p>
                  </div>
                  <div className="rounded-xl bg-stone-50/60 p-3 text-center">
                    <p className="text-2xl font-bold text-stone-700">{report.health_considerations.length}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Notes</p>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {personalization?.enabled && !personalization.blocked && (
              <PersonalizationWarnings personalization={personalization} />
            )}
            {(highCount > 0 || modCount > 0 || lowCount > 0 || posCount > 0) && (
              <Reveal delay={0.07}>
                <Card className="p-4">
                  <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>Score Breakdown</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {posCount > 0 && <ScoreBar label="Positive" value={posCount} max={8} color="#16a34a" delay={0.1}
                      icon={<ShieldCheck className="h-3 w-3 text-emerald-600" />} />}
                    {lowCount > 0 && <ScoreBar label="Low concerns" value={lowCount} max={6} color="#d97706" delay={0.14}
                      icon={<AlertTriangle className="h-3 w-3 text-amber-600" />} />}
                    {modCount > 0 && <ScoreBar label="Moderate concerns" value={modCount} max={4} color="#ea580c" delay={0.18}
                      icon={<AlertTriangle className="h-3 w-3 text-orange-600" />} />}
                    {highCount > 0 && <ScoreBar label="High concerns" value={highCount} max={3} color="#dc2626" delay={0.22}
                      icon={<AlertTriangle className="h-3 w-3 text-rose-600" />} />}
                  </div>
                </Card>
              </Reveal>
            )}
            {aiSummary && (
              <Reveal delay={0.11}>
                <Card className="p-4 border-amber-200/40 bg-gradient-to-br from-amber-50/80 to-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700/80">Gemma's Assessment</span>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-600">{aiSummary}</p>
                </Card>
              </Reveal>
            )}
            {report.original_ingredients && report.original_ingredients.length > 0 && (
              <Reveal delay={0.14}>
                <Card className="p-4">
                  <SectionLabel>All Ingredients</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {report.original_ingredients.map((ing, i) => {
                      const isConcern = report.ingredients_of_concern.some(c => ing.toLowerCase().includes(c.name.toLowerCase()));
                      const isPositive = report.positive_ingredients.some(p => ing.toLowerCase().includes(p.name.toLowerCase()));
                      const isGemmaResolved = (report.gemma_resolved_ingredients ?? []).some(g => ing.toLowerCase().includes(g.name.toLowerCase()));
                      return (
                        <Pill key={`${ing}-${i}`} variant={
                          isConcern ? 'concern-moderate' : isPositive ? 'positive' : isGemmaResolved ? 'gemma' : 'neutral'
                        }>{ing}</Pill>
                      );
                    })}
                  </div>
                </Card>
              </Reveal>
            )}
            {report.ingredients_of_concern.length > 0 && (
              <Reveal delay={0.17}>
                <Card className="p-4">
                  <SectionLabel>Concerns Detail</SectionLabel>
                  <div className="flex flex-col gap-2">
                    {report.ingredients_of_concern.map((c, i) => <ConcernCard key={c.name} concern={c} index={i} />)}
                  </div>
                </Card>
              </Reveal>
            )}
            {report.allergens.length > 0 && (
              <Reveal delay={0.2}>
                <Card className="p-4">
                  <SectionLabel>Allergens Detected</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {report.allergens.map((a, i) => (
                      <motion.div key={a.name}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-200/50 bg-amber-50/80 px-3 py-1.5"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.22 + i * 0.06 }}>
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800">{a.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </Reveal>
            )}
            <Reveal delay={0.24}>
              <motion.button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/80 to-white py-3.5 text-sm font-semibold text-amber-700 hover:from-amber-100/80 hover:shadow-sm transition-all"
                onClick={() => setChatOpen(true)}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <MessageCircle className="h-4 w-4" />
                Ask Gemma About This Report
              </motion.button>
            </Reveal>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {chatOpen && <ChatPanel reportJson={reportJson} onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function DemoReport({ onHome }: { onHome?: () => void; onNewScan?: () => void }) {
  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <header className="sticky top-0 z-30 border-b border-amber-200/30 bg-[#f8f5f0]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20">
              <Scan className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-stone-800">Health Report</h1>
          </div>
          {onHome && <button className="text-xs text-stone-500 hover:text-amber-600 transition-colors" onClick={onHome}>← Home</button>}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-5">
              <div className="flex flex-col items-center gap-3">
                <div className="h-48 w-48 rounded-2xl bg-stone-100 animate-pulse" />
                <div className="h-6 w-36 rounded-xl bg-stone-100 animate-pulse" />
                <div className="h-4 w-20 rounded-lg bg-stone-100 animate-pulse" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="p-4">
              <div className="h-3 w-24 rounded bg-stone-100 animate-pulse mb-3" />
              <div className="space-y-2"><div className="h-6 rounded bg-stone-100 animate-pulse" /><div className="h-6 rounded bg-stone-100 animate-pulse" /></div>
            </Card>
            <Card className="p-4">
              <div className="h-3 w-20 rounded bg-stone-100 animate-pulse mb-3" />
              <div className="flex flex-wrap gap-1.5">
                {[40, 56, 32, 64, 44].map(w => <div key={w} className="h-7 rounded-full bg-stone-100 animate-pulse" style={{ width: w }} />)}
              </div>
            </Card>
            <div className="rounded-xl border border-amber-200/30 bg-amber-50/60 px-4 py-3 text-xs text-amber-700/60">
              💡 Scan a food label to see the full health report.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportDashboard({ report, aiSummary, personalization, onHome, onNewScan, onOpenProfile }: Props) {
  if (report === null) return <DemoReport onHome={onHome} onNewScan={onNewScan} />;
  return (
    <RealReport
      report={report}
      aiSummary={aiSummary}
      personalization={personalization}
      onHome={onHome}
      onNewScan={onNewScan}
      onOpenProfile={onOpenProfile}
    />
  );
}
