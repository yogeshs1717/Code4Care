import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  AlertTriangle, Sparkles, Bot, Send, ShieldCheck,
  Leaf, MessageCircle, X, TrendingUp, BarChart3,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import type { DeterministicReport, GemmaMessage } from '../types/health';
import { chatWithGemma } from '../api/analyzeClient';
import { ResponsiveScoreGlobe } from './ScoreGlobe';

interface Props {
  report: DeterministicReport | null;
  aiSummary?: string | null;
  onHome?: () => void;
  onNewScan?: () => void;
}

// ── Reusable UI primitives ─────────────────────────────────────────────────────

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
    <div className={`rounded-2xl border border-slate-100/80 bg-white/80 backdrop-blur-sm shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-slate-400">{icon}</span>}
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {children}
      </p>
    </div>
  );
}

// ── Verdict badge ──────────────────────────────────────────────────────────────

function verdict(score: number) {
  if (score >= 72) return { text: 'Safe to Consume',        emoji: '🛡️', bg: 'bg-emerald-50', border: 'border-emerald-200', fg: 'text-emerald-700' };
  if (score >= 50) return { text: 'Consume in Moderation',  emoji: '⚖️', bg: 'bg-amber-50',   border: 'border-amber-200',   fg: 'text-amber-700'   };
  if (score >= 30) return { text: 'Proceed with Caution',   emoji: '⚠️', bg: 'bg-orange-50',  border: 'border-orange-200',  fg: 'text-orange-700'  };
  return             { text: 'Avoid if Possible',            emoji: '🚫', bg: 'bg-rose-50',    border: 'border-rose-200',    fg: 'text-rose-700'    };
}

// ── Animated horizontal score bar ──────────────────────────────────────────────

function ScoreBar({ label, value, max, color, icon, delay = 0 }: {
  label: string; value: number; max: number; color: string; icon?: React.ReactNode; delay?: number;
}) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          {icon && <span className="shrink-0">{icon}</span>}
          {label}
        </span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

// ── Ingredient pill ────────────────────────────────────────────────────────────

function Pill({ children, variant }: {
  children: React.ReactNode;
  variant: 'positive' | 'concern-high' | 'concern-moderate' | 'concern-low' | 'neutral' | 'gemma';
}) {
  const styles = {
    'positive':        'bg-emerald-50/80  border-emerald-200/80  text-emerald-800',
    'concern-high':    'bg-rose-50/80     border-rose-300/80     text-rose-800',
    'concern-moderate':'bg-rose-50/80     border-rose-200/80     text-rose-700',
    'concern-low':     'bg-amber-50/80    border-amber-200/80    text-amber-800',
    'neutral':         'bg-slate-100/80   border-slate-200/80    text-slate-600',
    'gemma':           'bg-blue-50/80     border-blue-200/80     text-blue-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      {variant === 'gemma' && <Sparkles className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

// ── Gemma Chat Panel ───────────────────────────────────────────────────────────

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
    const updatedMessages = [...messages, msg];
    setMessages(updatedMessages);
    setInput('');
    setBusy(true);
    try {
      const reply = await chatWithGemma(reportJson, updatedMessages, msg.content);
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Sorry, I couldn't reach Gemma right now." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [input, busy, messages, reportJson]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden border border-slate-100/80"
        initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 shadow-sm">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Ask Gemma</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 mt-0.5 shadow-sm">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-700'
                }`}>
                  {m.content}
                </div>
              </motion.div>
            ))}
            {busy && (
              <motion.div className="flex gap-2 justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 px-3.5 py-2.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-3">
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-50 transition-all"
            placeholder="Ask about an ingredient…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && send()} disabled={busy}
          />
          <motion.button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm disabled:opacity-40"
            onClick={send} disabled={!input.trim() || busy}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Concern detail card ────────────────────────────────────────────────────────

function ConcernCard({ concern, index }: { concern: { name: string; severity: string; concern: string }; index: number }) {
  const [open, setOpen] = useState(index < 2); // first 2 open by default
  return (
    <motion.div
      className={`rounded-xl border overflow-hidden transition-colors ${
        concern.severity === 'high'     ? 'border-rose-200/80 bg-rose-50/40' :
        concern.severity === 'moderate' ? 'border-amber-200/80 bg-amber-50/40' :
                                          'border-slate-100/80 bg-slate-50/40'
      }`}
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.24 + index * 0.06 }}
    >
      <button
        className="flex w-full items-center gap-2.5 p-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <AlertTriangle className={`h-4 w-4 shrink-0 ${
          concern.severity === 'high' ? 'text-rose-500' :
          concern.severity === 'moderate' ? 'text-amber-500' : 'text-slate-400'
        }`} />
        <span className="flex-1 text-sm font-semibold text-slate-800">
          {concern.name}
        </span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
          concern.severity === 'high' ? 'text-rose-500' :
          concern.severity === 'moderate' ? 'text-amber-500' : 'text-slate-400'
        }`}>
          {concern.severity}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="px-3 pb-3 pt-0"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-xs text-slate-500 leading-relaxed">{concern.concern}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Live Report ────────────────────────────────────────────────────────────────

function RealReport({ report, aiSummary, onHome, onNewScan }: {
  report: DeterministicReport;
  aiSummary?: string | null;
  onHome?: () => void;
  onNewScan?: () => void;
}) {
  const score = report.health_score.score;
  const color = report.health_score.color;
  const label = report.health_score.label;
  const v = verdict(score);
  const reportJson = useMemo(() => JSON.stringify(report), [report]);
  const [chatOpen, setChatOpen] = useState(false);

  const procColor =
    report.processing_level.label === 'Ultra-processed' ? 'text-rose-600' :
    report.processing_level.label === 'Processed'       ? 'text-amber-600' :
                                                          'text-emerald-600';

  const procBg =
    report.processing_level.label === 'Ultra-processed' ? 'bg-rose-50/80 border-rose-100/80' :
    report.processing_level.label === 'Processed'       ? 'bg-amber-50/80 border-amber-100/80' :
                                                          'bg-emerald-50/80 border-emerald-100/80';

  // Score breakdown counts
  const highCount = report.ingredients_of_concern.filter(c => c.severity === 'high').length;
  const modCount  = report.ingredients_of_concern.filter(c => c.severity === 'moderate').length;
  const lowCount  = report.ingredients_of_concern.filter(c => c.severity === 'low').length;
  const posCount  = report.positive_ingredients.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/60">
      {/* Floating header */}
      <header className="sticky top-0 z-30 border-b border-slate-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <motion.h1
            className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            Health Report
          </motion.h1>
          <div className="flex items-center gap-2">
            {onHome && (
              <motion.button
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                onClick={onHome} whileHover={{ x: -2 }}>
                ← Home
              </motion.button>
            )}
            {onNewScan && (
              <motion.button
                className="rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 shadow-sm backdrop-blur-sm"
                onClick={onNewScan} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                New Scan
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Main content — responsive grid */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN: Score hero + 3D globe ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Reveal delay={0.05}>
              <Card className="p-5 text-center bg-gradient-to-br from-white via-white to-slate-50/60">
                <div className="flex flex-col items-center gap-3">
                  <ResponsiveScoreGlobe score={score} color={color} />
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-bold ${v.bg} ${v.border} ${v.fg}`}>
                      <span>{v.emoji}</span>
                      <span>{v.text}</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color }}>{label}</p>
                  </div>
                </div>
              </Card>
            </Reveal>

            {/* Processing level */}
            <Reveal delay={0.08}>
              <Card className={`px-4 py-3.5 border ${procBg}`}>
                <div className="flex items-center gap-2">
                  <Leaf className={`h-4 w-4 shrink-0 ${procColor}`} />
                  <div>
                    <span className={`text-sm font-semibold ${procColor}`}>
                      {report.processing_level.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{report.processing_level.description}</p>
                  </div>
                </div>
              </Card>
            </Reveal>

            {/* Quick stats */}
            <Reveal delay={0.1}>
              <Card className="p-4">
                <SectionLabel icon={<BarChart3 className="h-3.5 w-3.5" />}>At a Glance</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50/60 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-700">{report.ingredients_of_concern.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Concerns</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/40 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{posCount}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Positives</p>
                  </div>
                  <div className="rounded-xl bg-amber-50/40 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{report.allergens.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Allergens</p>
                  </div>
                  <div className="rounded-xl bg-blue-50/40 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.health_considerations.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Notes</p>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>

          {/* ── RIGHT COLUMN (spans 2 of 3 on lg): Details ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Score breakdown bars */}
            {(highCount > 0 || modCount > 0 || lowCount > 0 || posCount > 0) && (
              <Reveal delay={0.07}>
                <Card className="p-4">
                  <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>Score Breakdown</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {posCount > 0 && (
                      <ScoreBar label="Positive" value={posCount} max={8} color="#34A853" delay={0.1}
                        icon={<ShieldCheck className="h-3 w-3 text-emerald-500" />} />
                    )}
                    {lowCount > 0 && (
                      <ScoreBar label="Low concerns" value={lowCount} max={6} color="#FBBC04" delay={0.14}
                        icon={<AlertTriangle className="h-3 w-3 text-amber-400" />} />
                    )}
                    {modCount > 0 && (
                      <ScoreBar label="Moderate concerns" value={modCount} max={4} color="#EA7535" delay={0.18}
                        icon={<AlertTriangle className="h-3 w-3 text-orange-400" />} />
                    )}
                    {highCount > 0 && (
                      <ScoreBar label="High concerns" value={highCount} max={3} color="#EA4335" delay={0.22}
                        icon={<AlertTriangle className="h-3 w-3 text-rose-400" />} />
                    )}
                  </div>
                </Card>
              </Reveal>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <Reveal delay={0.11}>
                <Card className="p-4 border-violet-100/60 bg-gradient-to-br from-violet-50/40 via-white to-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600">Gemma's Assessment</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{aiSummary}</p>
                </Card>
              </Reveal>
            )}

            {/* Ingredients — full list */}
            {report.original_ingredients && report.original_ingredients.length > 0 && (
              <Reveal delay={0.14}>
                <Card className="p-4">
                  <SectionLabel>All Ingredients</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {report.original_ingredients.map((ing, i) => {
                      // Check if this ingredient is flagged as a concern or positive
                      const isConcern = report.ingredients_of_concern.some(
                        c => ing.toLowerCase().includes(c.name.toLowerCase())
                      );
                      const isPositive = report.positive_ingredients.some(
                        p => ing.toLowerCase().includes(p.name.toLowerCase())
                      );
                      const isGemmaResolved = (report.gemma_resolved_ingredients ?? []).some(
                        g => ing.toLowerCase().includes(g.name.toLowerCase())
                      );
                      return (
                        <Pill key={`${ing}-${i}`} variant={
                          isConcern ? 'concern-moderate' :
                          isPositive ? 'positive' :
                          isGemmaResolved ? 'gemma' : 'neutral'
                        }>
                          {ing}
                        </Pill>
                      );
                    })}
                  </div>
                </Card>
              </Reveal>
            )}

            {/* Concerns detail */}
            {report.ingredients_of_concern.length > 0 && (
              <Reveal delay={0.17}>
                <Card className="p-4">
                  <SectionLabel>Concerns Detail</SectionLabel>
                  <div className="flex flex-col gap-2">
                    {report.ingredients_of_concern.map((c, i) => (
                      <ConcernCard key={c.name} concern={c} index={i} />
                    ))}
                  </div>
                </Card>
              </Reveal>
            )}

            {/* Allergens */}
            {report.allergens.length > 0 && (
              <Reveal delay={0.2}>
                <Card className="p-4">
                  <SectionLabel>Allergens Detected</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {report.allergens.map((a, i) => (
                      <motion.div key={a.name}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-1.5"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.22 + i * 0.06 }}>
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-800">{a.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </Reveal>
            )}

            {/* Ask Gemma */}
            <Reveal delay={0.24}>
              <motion.button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-white py-3.5 text-sm font-semibold text-violet-600 shadow-sm hover:shadow-md transition-all"
                onClick={() => setChatOpen(true)}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <MessageCircle className="h-4 w-4" />
                Ask Gemma About This Report
              </motion.button>
            </Reveal>

          </div>
        </div>
      </div>

      {/* Chat modal */}
      <AnimatePresence>
        {chatOpen && <ChatPanel reportJson={reportJson} onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Demo/Skeleton ──────────────────────────────────────────────────────────────

function DemoReport({ onHome }: { onHome?: () => void; onNewScan?: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/60">
      <header className="sticky top-0 z-30 border-b border-slate-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Health Report
          </h1>
          {onHome && (
            <button className="text-xs text-slate-400 hover:text-slate-600" onClick={onHome}>← Home</button>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-5">
              <div className="flex flex-col items-center gap-3">
                <div className="h-48 w-48 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-6 w-36 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-4 w-20 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="p-4">
              <div className="h-3 w-24 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-6 rounded bg-slate-100 animate-pulse" />
                <div className="h-6 rounded bg-slate-100 animate-pulse" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="h-3 w-20 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="flex flex-wrap gap-1.5">
                {[40, 56, 32, 64, 44].map(w => (
                  <div key={w} className="h-7 rounded-full bg-slate-100 animate-pulse" style={{ width: w }} />
                ))}
              </div>
            </Card>
            <div className="rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50/50 px-4 py-3 text-xs text-violet-600 border border-violet-100/60">
              💡 Scan a food label to see the full health report powered by the rule engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function ReportDashboard({ report, aiSummary, onHome, onNewScan }: Props) {
  if (report === null) return <DemoReport onHome={onHome} onNewScan={onNewScan} />;
  return <RealReport report={report} aiSummary={aiSummary} onHome={onHome} onNewScan={onNewScan} />;
}
