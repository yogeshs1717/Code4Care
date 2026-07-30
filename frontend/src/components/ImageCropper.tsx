import { useRef, useState } from 'react';
import { cropImageToFile } from '../lib/cropImage';

interface Props {
  src: string;
  busy: boolean;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

/** Crop rect as fractions of the image (0..1) so it survives layout changes. */
interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br';

const HANDLES: DragMode[] = ['tl', 'tr', 'bl', 'br'];
const MIN_SIZE = 0.08;
const DEFAULT_RECT: NormRect = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function applyDrag(rect: NormRect, mode: DragMode, dx: number, dy: number): NormRect {
  if (mode === 'move') {
    return {
      ...rect,
      x: clamp(rect.x + dx, 0, 1 - rect.width),
      y: clamp(rect.y + dy, 0, 1 - rect.height),
    };
  }

  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (mode === 'tl' || mode === 'bl') left = clamp(left + dx, 0, right - MIN_SIZE);
  if (mode === 'tr' || mode === 'br') right = clamp(right + dx, left + MIN_SIZE, 1);
  if (mode === 'tl' || mode === 'tr') top = clamp(top + dy, 0, bottom - MIN_SIZE);
  if (mode === 'bl' || mode === 'br') bottom = clamp(bottom + dy, top + MIN_SIZE, 1);

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function ImageCropper({ src, busy, onConfirm, onCancel, onError }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ mode: DragMode; px: number; py: number; rect: NormRect } | null>(
    null,
  );
  const [rect, setRect] = useState<NormRect>(DEFAULT_RECT);
  const [loaded, setLoaded] = useState(false);

  const startDrag = (event: React.PointerEvent, mode: DragMode) => {
    if (busy) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, px: event.clientX, py: event.clientY, rect };
  };

  const handleMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const image = imgRef.current;
    if (!drag || !image) return;
    const dx = (event.clientX - drag.px) / image.clientWidth;
    const dy = (event.clientY - drag.py) / image.clientHeight;
    setRect(applyDrag(drag.rect, drag.mode, dx, dy));
  };

  const endDrag = (event: React.PointerEvent) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image) return;
    try {
      const file = await cropImageToFile(image, {
        x: rect.x * image.naturalWidth,
        y: rect.y * image.naturalHeight,
        width: rect.width * image.naturalWidth,
        height: rect.height * image.naturalHeight,
      });
      onConfirm(file);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Could not crop the image.');
    }
  };

  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };

  return (
    <div className="stack">
      <p className="hint">Drag the corners so only the ingredient list is inside the box.</p>

      <div className="cropper">
        <img
          ref={imgRef}
          src={src}
          alt="Selected label"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() =>
            // Declared MIME type can lie; a corrupt file only fails here.
            onError('This image could not be opened. Please choose another file.')
          }
        />
        <div
          className="crop-window"
          style={style}
          onPointerDown={(event) => startDrag(event, 'move')}
          onPointerMove={handleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {HANDLES.map((handle) => (
            <span
              key={handle}
              className={`crop-handle crop-handle-${handle}`}
              onPointerDown={(event) => startDrag(event, handle)}
              onPointerMove={handleMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleConfirm}
        disabled={busy || !loaded}
      >
        {busy ? 'Reading label…' : 'Run OCR'}
      </button>
      <button type="button" className="btn" onClick={onCancel} disabled={busy}>
        Retake / choose another
      </button>
    </div>
  );
}
