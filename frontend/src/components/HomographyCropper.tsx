import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { cropImageToFile } from '../lib/cropImage';

interface Props {
  src: string;
  busy: boolean;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

/** Crop rect as fractions of the rendered image area (0–1). */
interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const DEFAULT_RECT: NormRect = { x: 0.05, y: 0.1, width: 0.9, height: 0.8 };
const MIN_SIZE = 0.06;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function applyDrag(
  rect: NormRect,
  handle: Handle,
  dx: number,
  dy: number,
): NormRect {
  if (handle === 'move') {
    return {
      ...rect,
      x: clamp(rect.x + dx, 0, 1 - rect.width),
      y: clamp(rect.y + dy, 0, 1 - rect.height),
    };
  }

  let left   = rect.x;
  let top    = rect.y;
  let right  = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle === 'tl' || handle === 'bl') left   = clamp(left   + dx, 0,           right  - MIN_SIZE);
  if (handle === 'tr' || handle === 'br') right  = clamp(right  + dx, left + MIN_SIZE, 1);
  if (handle === 'tl' || handle === 'tr') top    = clamp(top    + dy, 0,           bottom - MIN_SIZE);
  if (handle === 'bl' || handle === 'br') bottom = clamp(bottom + dy, top  + MIN_SIZE, 1);

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Standard 2-D rectangular cropper.
 *
 * Drop-in replacement for the broken HomographyCropper — same props, same
 * onConfirm(File) contract, no perspective-warp logic.
 */
export function HomographyCropper({ src, busy, onConfirm, onCancel, onError }: Props) {
  const imgRef  = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    startRect: NormRect;
  } | null>(null);

  const [rect,   setRect]   = useState<NormRect>(DEFAULT_RECT);
  const [loaded, setLoaded] = useState(false);

  // ── Pointer events ────────────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (handle: Handle) => (e: React.PointerEvent) => {
      if (busy || !loaded) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: rect,
      };
    },
    [busy, loaded, rect],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ds  = dragState.current;
    const img = imgRef.current;
    if (!ds || !img) return;

    const dx = (e.clientX - ds.startX) / img.clientWidth;
    const dy = (e.clientY - ds.startY) / img.clientHeight;
    setRect(applyDrag(ds.startRect, ds.handle, dx, dy));
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !loaded) return;
    try {
      const file = await cropImageToFile(img, {
        x:      rect.x      * img.naturalWidth,
        y:      rect.y      * img.naturalHeight,
        width:  rect.width  * img.naturalWidth,
        height: rect.height * img.naturalHeight,
      });
      onConfirm(file);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Could not crop the image.');
    }
  }, [rect, loaded, onConfirm, onError]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetRect = useCallback(() => setRect(DEFAULT_RECT), []);

  // ── Styles for the selection box ─────────────────────────────────────────

  const boxStyle = {
    left:   `${rect.x      * 100}%`,
    top:    `${rect.y      * 100}%`,
    width:  `${rect.width  * 100}%`,
    height: `${rect.height * 100}%`,
  } as React.CSSProperties;

  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#202124]">
          Drag the box to frame the ingredient list
        </p>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-[#e8eaed] bg-white px-2.5 py-1.5 text-xs text-[#5f6368] transition-colors hover:border-[#d0d2d4] disabled:opacity-40"
          onClick={resetRect}
          disabled={busy}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* ── Image + overlay ── */}
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl bg-black"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Label to crop"
          className="block w-full max-h-[55vh] object-contain"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => onError('This image could not be opened. Please choose another file.')}
        />

        {loaded && (
          <>
            {/* Dark overlay — four quadrants around the crop box */}
            {/* Top */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 bg-black/50"
              style={{ height: boxStyle.top }}
            />
            {/* Bottom */}
            <div
              className="pointer-events-none absolute left-0 right-0 bottom-0 bg-black/50"
              style={{ top: `calc(${boxStyle.top} + ${boxStyle.height})` }}
            />
            {/* Left */}
            <div
              className="pointer-events-none absolute bg-black/50"
              style={{
                top:    boxStyle.top,
                height: boxStyle.height,
                left:   0,
                width:  boxStyle.left,
              }}
            />
            {/* Right */}
            <div
              className="pointer-events-none absolute bg-black/50"
              style={{
                top:    boxStyle.top,
                height: boxStyle.height,
                left:   `calc(${boxStyle.left} + ${boxStyle.width})`,
                right:  0,
              }}
            />

            {/* ── Crop box ── */}
            <div
              className="absolute box-border cursor-move border-2 border-[#4285F4]"
              style={boxStyle}
              onPointerDown={onPointerDown('move')}
            >
              {/* Animated corner rule lines */}
              {/* Top-left corner */}
              <span className="absolute -left-0.5 -top-0.5 h-4 w-4 border-l-2 border-t-2 border-white" />
              {/* Top-right corner */}
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 border-r-2 border-t-2 border-white" />
              {/* Bottom-left corner */}
              <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 border-b-2 border-l-2 border-white" />
              {/* Bottom-right corner */}
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 border-b-2 border-r-2 border-white" />

              {/* Rule-of-thirds grid lines */}
              <span className="pointer-events-none absolute inset-0 border-x border-white/20" style={{ left: '33.33%', right: '33.33%', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />
              <span className="pointer-events-none absolute inset-0" style={{ top: '33.33%', bottom: '33.33%', borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }} />

              {/* ── Corner drag handles ── */}
              {/* TL */}
              <div
                className="absolute -left-3 -top-3 h-6 w-6 cursor-nwse-resize touch-none"
                onPointerDown={onPointerDown('tl')}
              >
                <div className="h-full w-full rounded-full border-2 border-white bg-[#4285F4] shadow-md" />
              </div>
              {/* TR */}
              <div
                className="absolute -right-3 -top-3 h-6 w-6 cursor-nesw-resize touch-none"
                onPointerDown={onPointerDown('tr')}
              >
                <div className="h-full w-full rounded-full border-2 border-white bg-[#4285F4] shadow-md" />
              </div>
              {/* BL */}
              <div
                className="absolute -bottom-3 -left-3 h-6 w-6 cursor-nesw-resize touch-none"
                onPointerDown={onPointerDown('bl')}
              >
                <div className="h-full w-full rounded-full border-2 border-white bg-[#4285F4] shadow-md" />
              </div>
              {/* BR */}
              <div
                className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize touch-none"
                onPointerDown={onPointerDown('br')}
              >
                <div className="h-full w-full rounded-full border-2 border-white bg-[#4285F4] shadow-md" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Tip ── */}
      <p className="text-xs text-[#5f6368]">
        Drag corners to resize · Drag inside the box to reposition
      </p>

      {/* ── Actions ── */}
      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#4285F4] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4285F4]/25 transition-all hover:bg-[#3367D6] disabled:opacity-40"
        onClick={handleConfirm}
        disabled={busy || !loaded}
      >
        <Check className="h-4 w-4" />
        {busy ? 'Cropping…' : 'Run OCR'}
      </button>

      <button
        type="button"
        className="rounded-xl border border-[#e8eaed] bg-white py-3 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#fafafa] disabled:opacity-40"
        onClick={onCancel}
        disabled={busy}
      >
        Retake / choose another
      </button>
    </motion.div>
  );
}
