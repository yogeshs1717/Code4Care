import { useRef } from 'react';
import { SUPPORTED_IMAGE_TYPES, validateImageFile } from '../lib/imageValidation';

interface Props {
  onSelect: (file: File) => void;
  onInvalid: (message: string) => void;
}

const ACCEPT = SUPPORTED_IMAGE_TYPES.join(',');

export function ImageSourcePicker({ onSelect, onInvalid }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so re-selecting the same file still fires a change event.
    event.target.value = '';
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      onInvalid(error);
      return;
    }
    onSelect(file);
  };

  return (
    <div className="stack">
      <p className="hint">
        Photograph the ingredient list on the pack. Fill the frame and keep the text sharp.
      </p>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => cameraInputRef.current?.click()}
      >
        Take photo
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => uploadInputRef.current?.click()}
      >
        Upload image
      </button>

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
    </div>
  );
}
