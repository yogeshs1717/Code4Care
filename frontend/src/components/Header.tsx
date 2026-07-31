import { motion } from 'framer-motion';
import { Scan, LogIn } from 'lucide-react';

interface HeaderProps {
  variant?: 'hero' | 'app';
  onSignIn?: () => void;
  onNewScan?: () => void;
  onHome?: () => void;
}

export function Header({ variant = 'hero', onSignIn, onNewScan, onHome }: HeaderProps) {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between px-4 sm:px-8 py-3 max-w-7xl">
        {/* Logo */}
        <motion.button
          onClick={onHome}
          className="flex items-center gap-2.5 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-stone-800">
            Code<span className="text-amber-600">4</span>Care
          </span>
        </motion.button>

        {/* Nav links - desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Home', onClick: onHome },
            { label: 'Scan', onClick: onNewScan },
          ].map((link) => (
            <button
              key={link.label}
              onClick={link.onClick}
              className="text-sm text-stone-500 hover:text-amber-600 transition-colors font-medium"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {variant === 'hero' && (
            <motion.button
              onClick={onSignIn}
              className="flex items-center gap-2 rounded-xl border border-stone-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-white hover:border-stone-300/60 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </motion.button>
          )}
          {variant === 'app' && onNewScan && (
            <motion.button
              onClick={onNewScan}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Scan className="h-4 w-4" />
              New Scan
            </motion.button>
          )}
        </div>
      </div>

      {/* Bottom border */}
      <div className="h-px mx-4 sm:mx-8 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
    </motion.header>
  );
}
