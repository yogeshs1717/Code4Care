import { Scan, Mail } from 'lucide-react';

interface FooterProps {
  onHome?: () => void;
  onNewScan?: () => void;
}

export function Footer({ onHome, onNewScan }: FooterProps) {
  return (
    <footer className="relative border-t border-amber-200/30 bg-amber-50/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 shadow-lg shadow-amber-500/20">
                <Scan className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-stone-800">
                Code<span className="text-amber-600">4</span>Care
              </span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
              Ingredient intelligence for everyone. Scan, understand, and make informed food choices.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Quick Links</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Home', onClick: onHome },
                { label: 'Scan a Label', onClick: onNewScan },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={link.onClick}
                  className="text-sm text-stone-500 hover:text-amber-600 transition-colors text-left"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Connect</h3>
            <div className="flex flex-col gap-2">
              <a href="mailto:hello@code4care.app" className="flex items-center gap-2 text-sm text-stone-500 hover:text-amber-600 transition-colors">
                <Mail className="h-3.5 w-3.5" />
                hello@code4care.app
              </a>
              <span className="flex items-center gap-2 text-sm text-stone-400">
                <Scan className="h-3.5 w-3.5" />
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-amber-200/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} Code4Care. Made with ❤️ for informed eating.
          </p>
          <p className="text-xs text-stone-400">
            Not medical advice. Always consult a healthcare professional.
          </p>
        </div>
      </div>
    </footer>
  );
}
