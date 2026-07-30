import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { chatWithGemma } from '../api/analyzeClient';

interface GemmaChatViewProps {
  available?: boolean;
  ingredientText?: string;
}

export function GemmaChatView({ available = false, ingredientText = '' }: GemmaChatViewProps) {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >(
    available
      ? [{ role: 'assistant', content: 'Ask me anything about the ingredients in this product.' }]
      : []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !available || loading) return;
    const userMsg = { role: 'user' as const, content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
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
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <motion.h2
        className="flex items-center gap-2 text-2xl font-bold text-[#202124]"
        style={{ fontFamily: 'var(--font-heading)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sparkles className="h-5 w-5 text-[#4285F4]" />
        Ask Gemma
      </motion.h2>

      {!available ? (
        <motion.div
          className="flex flex-col items-center gap-4 rounded-2xl border border-[#e8eaed] bg-white px-6 py-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Bot className="h-12 w-12 text-[#4285F4]/40" />
          <div>
            <p className="font-semibold text-[#202124]">Gemma AI — Coming Soon</p>
            <p className="mt-1 text-xs text-[#5f6368]">
              The chat interface will let you ask questions about your ingredients
              once the backend is complete.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ── Messages ── */}
          <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/10">
                      <Bot className="h-4 w-4 text-[#4285F4]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#4285F4] text-white'
                        : 'border border-[#e8eaed] bg-white text-[#202124]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4285F4]">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  className="flex gap-3 justify-start"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/10">
                    <Bot className="h-4 w-4 text-[#4285F4]" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#e8eaed] bg-white px-4 py-2.5 text-sm text-[#5f6368]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Input ── */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-[#e8eaed] bg-white px-4 py-3 text-sm outline-none transition-all focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20"
              placeholder="Ask about an ingredient..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <motion.button
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4285F4] text-white disabled:opacity-40"
              onClick={handleSend}
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
