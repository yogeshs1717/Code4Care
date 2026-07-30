interface Props {
  value: string;
  confidence: number | null;
  onChange: (value: string) => void;
  onRestart: () => void;
}

export function OcrTextEditor({ value, confidence, onChange, onRestart }: Props) {
  return (
    <div className="stack">
      <div className="status status-success" role="status">
        Text extracted. Correct anything OCR misread before analysis.
        {confidence !== null && (
          <span className="confidence"> OCR confidence {Math.round(confidence * 100)}%</span>
        )}
      </div>

      <label className="field-label" htmlFor="ocr-text">
        Ingredient text
      </label>
      <textarea
        id="ocr-text"
        className="ocr-textarea"
        value={value}
        rows={12}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />

      {/* Placeholder: analysis is implemented in a later task. */}
      <button type="button" className="btn btn-primary" disabled>
        Analyze (coming soon)
      </button>
      <button type="button" className="btn" onClick={onRestart}>
        Scan another label
      </button>
    </div>
  );
}
