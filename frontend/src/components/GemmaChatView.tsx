import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { chatWithGemma } from '../api/analyzeClient';

interface GemmaChatViewProps {
  available?: boolean;
  ingredientText?: string;
}

const QUICK_QUESTIONS = [
  'What are the worst ingredients here?',
  'Any allergens I should avoid?',
  'Why is this score low?',
  'Are there hidden artificial sugars?',
];

export function GemmaChatView({
  available = false,
  ingredientText = '',
}: GemmaChatViewProps) {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >(
    available
      ? [
          {
            role: 'assistant',
            content:
              'Hello! I am Gemma. Ask me anything about the ingredients, allergens, or health impacts of this product.',
          },
        ]
      : []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = (customMessage || input).trim();
    if (!textToSend || !available || loading) return;

    const userMsg = { role: 'user' as const, content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!customMessage) setInput('');
    setLoading(true);

    try {
      const reply = await chatWithGemma(
        ingredientText,
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        userMsg.content
      );
      setMessages((prev) => [
        ...prev,
        { role: 'assistant' as const, content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, I had trouble processing that. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8 sm:px-6 max-w-lg mx-auto w-full">
      {/* ── Header ── */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Ask Gemma AI
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              Gemma 4 model via Google AI Studio
            </p>
          </div>
        </div>

        {available && messages.length > 1 && (
          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: 'Ask me anything about the ingredients in this product.',
                },
              ])
            }
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </motion.div>

      {!available ? (
        <motion.div
          className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Gemma AI Ready</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Complete a label scan to ask Gemma questions about ingredients and health analysis.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ── Quick Question Suggestion Chips ── */}
          {messages.length <= 2 && (
            <motion.div
              className="flex flex-wrap gap-1.5 pt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="rounded-full bg-indigo-50/90 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/80 active:scale-96 transition-all text-left"
                >
                  ✨ {q}
                </button>
              ))}
            </motion.div>
          )}

          {/* ── Messages Container ── */}
          <div className="flex min-h-[260px] max-h-[380px] flex-col gap-3 overflow-y-auto rounded-3xl border border-slate-200/90 bg-slate-50/60 p-4 shadow-inner">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[84%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-br-none'
                        : 'border border-slate-200/80 bg-white text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-white shadow-xs mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  className="flex gap-2.5 justify-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-2xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span>Gemma is thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-xs sm:text-sm outline-none shadow-xs transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400"
              placeholder="Ask Gemma about an ingredient..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <motion.button
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 disabled:opacity-40"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
