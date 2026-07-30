import { useCallback, useEffect, useRef, useState } from 'react';
import { OcrRequestError, requestOcr } from './api/ocrClient';
import { ImageCropper } from './components/ImageCropper';
import { ImageSourcePicker } from './components/ImageSourcePicker';
import { OcrTextEditor } from './components/OcrTextEditor';
import type { OcrResult } from './types/ocr';

type Stage = 'select' | 'crop' | 'edit';

export default function App() {
  const [stage, setStage] = useState<Stage>('select');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const revokePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = () => {
    abortRef.current?.abort();
    revokePreview();
    setResult(null);
    setText('');
    setError(null);
    setBusy(false);
    setStage('select');
  };

  const handleSelect = (file: File) => {
    revokePreview();
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setStage('crop');
  };

  const handleRunOcr = async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);

    try {
      const ocr = await requestOcr(file, controller.signal);
      setResult(ocr);
      setText(ocr.text);
      setStage('edit');
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(
        cause instanceof OcrRequestError ? cause.message : 'OCR failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>Care</h1>
        <p>Read what is actually in your food.</p>
      </header>

      {error && (
        <div className="status status-error" role="alert">
          {error}
        </div>
      )}

      {stage === 'select' && (
        <ImageSourcePicker onSelect={handleSelect} onInvalid={setError} />
      )}

      {stage === 'crop' && previewUrl && (
        <ImageCropper
          src={previewUrl}
          busy={busy}
          onConfirm={handleRunOcr}
          onCancel={reset}
          onError={setError}
        />
      )}

      {stage === 'edit' && result && (
        <OcrTextEditor
          value={text}
          confidence={result.metadata.confidence}
          onChange={setText}
          onRestart={reset}
        />
      )}
    </main>
  );
}
