/** Mirrors backend/models/ocr.py and backend/models/errors.py. Keep in sync. */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrBlock {
  text: string;
  confidence: number | null;
  bounding_box: BoundingBox | null;
}

/** Provider-attributed quality signals; keeps the root response provider-agnostic. */
export interface OcrMetadata {
  provider: string;
  confidence: number | null;
}

export interface OcrResult {
  text: string;
  blocks: OcrBlock[];
  metadata: OcrMetadata;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}
