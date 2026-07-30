import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload } from 'lucide-react';
import { SUPPORTED_IMAGE_TYPES, validateImageFile } from '../lib/imageValidation';

const ACCEPT = SUPPORTED_IMAGE_TYPES.join(',');

interface CaptureViewProps {
  onSelect: (file: File) => void;
  onInvalid: (message: string) => void;
}

export function CaptureView({ onSelect, onInvalid }: CaptureViewProps) {
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
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.div
      className="flex flex-col gap-6 px-4 pt-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="text-center">
        <motion.h2
          className="text-2xl font-bold text-[#202124]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Capture Your Label
        </motion.h2>
        <motion.p className="mt-1.5 text-sm text-[#5f6368]">
          Photograph the ingredient list — fill the frame and keep text sharp
        </motion.p>
      </motion.div>

      {/* ── Camera Button ── */}
      <motion.button
        variants={item}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#4285F4]/30 bg-[#4285F4]/5 px-6 py-10 transition-all hover:border-[#4285F4]/60 hover:bg-[#4285F4]/10"
        onClick={() => cameraInputRef.current?.click()}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4285F4]/10 transition-colors group-hover:bg-[#4285F4]/20">
          <Camera className="h-7 w-7 text-[#4285F4]" />
        </div>
        <div className="text-center">
          <span className="text-base font-semibold text-[#202124]">Take Photo</span>
          <p className="mt-0.5 text-xs text-[#5f6368]">Use your camera</p>
        </div>
      </motion.button>

      {/* ── Upload Button ── */}
      <motion.button
        variants={item}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-[#e8eaed] bg-white px-6 py-8 transition-all hover:border-[#5f6368]/30 hover:shadow-sm"
        onClick={() => uploadInputRef.current?.click()}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] transition-colors group-hover:bg-[#e8eaed]">
          <Upload className="h-6 w-6 text-[#5f6368]" />
        </div>
        <div className="text-center">
          <span className="text-base font-semibold text-[#202124]">Upload Image</span>
          <p className="mt-0.5 text-xs text-[#5f6368]">JPG, PNG or WebP</p>
        </div>
      </motion.button>

      {/* ── Hidden Inputs ── */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={handleChange}
      />
    </motion.div>
  );
}
