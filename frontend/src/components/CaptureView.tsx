import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, ScanLine } from 'lucide-react';
import { SUPPORTED_IMAGE_TYPES, validateImageFile } from '../lib/imageValidation';

const ACCEPT = SUPPORTED_IMAGE_TYPES.join(',');

interface CaptureViewProps {
  onSelect: (file: File) => void;
  onInvalid: (message: string) => void;
  onBack?: () => void;
}

export function CaptureView({ onSelect, onInvalid, onBack }: CaptureViewProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      onInvalid(error);
      return;
    }
    onSelect(file);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.div
      className="flex flex-col gap-5 px-4 pt-6 pb-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {onBack && (
        <motion.button
          variants={item}
          className="text-sm text-stone-500 hover:text-amber-600 transition-colors self-start"
          onClick={onBack}
          whileHover={{ x: -2 }}
        >
          ← Back
        </motion.button>
      )}

      <motion.div variants={item} className="text-center">
        <motion.div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-500 mb-4 shadow-lg shadow-amber-500/20">
          <ScanLine className="h-7 w-7 text-white" />
        </motion.div>
        <motion.h2
          className="text-2xl font-bold text-stone-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Capture Your Label
        </motion.h2>
        <motion.p className="mt-1.5 text-sm text-stone-500 max-w-sm mx-auto">
          Photograph the ingredient list on the package — keep it sharp and well-lit
        </motion.p>
      </motion.div>

      {/* Camera Button */}
      <motion.button
        variants={item}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-amber-300/40 bg-amber-50/50 px-6 py-10 transition-all hover:border-amber-400/60 hover:bg-amber-50/80 overflow-hidden"
        onClick={() => cameraInputRef.current?.click()}
      >
        <div className="absolute -inset-20 bg-amber-300/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/40 transition-colors group-hover:from-amber-200 group-hover:to-amber-300">
          <Camera className="h-7 w-7 text-amber-700" />
        </div>
        <div className="relative text-center">
          <span className="text-base font-semibold text-stone-800">Take Photo</span>
          <p className="mt-0.5 text-xs text-stone-500">Use your camera</p>
        </div>
      </motion.button>

      {/* Upload Button */}
      <motion.button
        variants={item}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex flex-col items-center gap-4 rounded-2xl border border-stone-200/50 bg-white/60 px-6 py-8 transition-all hover:bg-white/80 hover:border-stone-300/50 overflow-hidden"
        onClick={() => uploadInputRef.current?.click()}
      >
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-stone-100/80 border border-stone-200/50 transition-colors group-hover:bg-stone-200/60">
          <Upload className="h-6 w-6 text-stone-600" />
        </div>
        <div className="relative text-center">
          <span className="text-base font-semibold text-stone-800">Upload Image</span>
          <p className="mt-0.5 text-xs text-stone-500">JPG, PNG or WebP</p>
        </div>
      </motion.button>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={uploadInputRef} type="file" accept={ACCEPT} hidden onChange={handleChange} />
    </motion.div>
  );
}
