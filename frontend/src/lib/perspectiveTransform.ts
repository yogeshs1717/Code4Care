/** Homography (perspective transform) utilities for correcting label photos.

  Given 4 source points (the photographed quadrilateral of the ingredient label)
  and 4 destination points (the rectified rectangle), computes a 3×3 homography
  matrix and warps the image so the label appears front-on — dramatically
  improving OCR accuracy on photos taken at an angle.

  All math is done in vanilla JS — no OpenCV, no WebGL, no external deps.
 */

export interface Point {
  x: number;
  y: number;
}

/** ── Linear algebra helpers ────────────────────────────────────────────── */

/**
 * Solve A·h = b for h via Gaussian elimination with partial pivoting.
 * A is an n×n matrix (array of rows), b is the length-n RHS.
 * Returns h (length n).
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[col], M[maxRow]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // singular — skip

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }

  // Back-substitution
  const h = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * h[j];
    h[i] = sum / M[i][i];
  }
  return h;
}

/** ── Homography ────────────────────────────────────────────────────────── */

/**
 * Compute the 3×3 homography matrix H that maps each src point → dst point.
 * Returns H as a flat array [h00, h01, h02, h10, h11, h12, h20, h21, h22]
 * with h22 = 1 (normalised so the matrix has scale invariance).
 */
export function computeHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: xp, y: yp } = dst[i];

    // h00·x + h01·y + h02 - h20·x·x' - h21·y·x' = x'
    A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
    b.push(xp);

    // h10·x + h11·y + h12 - h20·x·y' - h21·y·y' = y'
    A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
    b.push(yp);
  }

  const h = solveLinearSystem(A, b);
  return [...h, 1]; // h22 = 1 (scale)
}

/**
 * Apply a homography H (8- or 9-element array) to a single point (x, y).
 * Returns the mapped point.
 */
export function applyHomography(H: number[], x: number, y: number): Point {
  const w = H[6] * x + H[7] * y + (H[8] ?? 1);
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

/** ── Image warping ─────────────────────────────────────────────────────── */

/**
 * Warp `sourceImage` so that the quadrilateral defined by `srcCorners`
 * (4 Point, in natural-image pixels) is mapped to a front-on rectangle.

 * @returns A Promise<Blob> of the warped image as JPEG.
 */
export async function warpPerspective(
  sourceImage: HTMLImageElement,
  srcCorners: [Point, Point, Point, Point],
  outputWidth?: number,
  outputHeight?: number,
): Promise<Blob> {
  const ow = outputWidth ?? Math.max(1, Math.round(sourceImage.naturalWidth * 0.75));
  const oh = outputHeight ?? Math.max(1, Math.round(sourceImage.naturalHeight * 0.75));

  // Destination: map the quad to the full output rectangle
  const dstCorners: Point[] = [
    { x: 0, y: 0 },
    { x: ow - 1, y: 0 },
    { x: ow - 1, y: oh - 1 },
    { x: 0, y: oh - 1 },
  ];

  // H maps src → dst; we need H⁻¹ (dst → src) for inverse mapping
  const H = computeHomography(srcCorners, dstCorners);
  const Hinv = invertHomography(H);

  // Render via inverse mapping
  const canvas = document.createElement('canvas');
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext('2d')!;

  // Off-screen source canvas for fast pixel sampling
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = sourceImage.naturalWidth;
  srcCanvas.height = sourceImage.naturalHeight;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(sourceImage, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const srcPixels = srcData.data;

  // For each output pixel, find the source pixel via H⁻¹ and bilinear sample
  const outData = ctx.createImageData(ow, oh);
  const out = outData.data;

  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const src = applyHomography(Hinv, x, y);
      const { r, g, b, a } = sampleBilinear(
        srcPixels, srcCanvas.width, srcCanvas.height,
        src.x, src.y,
      );
      const idx = (y * ow + x) * 4;
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = a;
    }
  }

  ctx.putImageData(outData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92,
    );
  });
}

/** ── Internal helpers ──────────────────────────────────────────────────── */

/** Invert a 3×3 homography matrix (full 9-element array). */
function invertHomography(H: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = H;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) throw new Error('Singular homography — cannot invert.');

  const invDet = 1 / det;
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/** Bilinear interpolation at floating-point (x, y) in a pixel buffer. */
function sampleBilinear(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } {
  // Edge clamp
  const sx = Math.max(0, Math.min(w - 1, x));
  const sy = Math.max(0, Math.min(h - 1, y));

  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const nw = (1 - fx) * (1 - fy);
  const ne = fx * (1 - fy);
  const sw = (1 - fx) * fy;
  const se = fx * fy;

  const idx = (iy * w + ix) * 4;
  const idxN = iy + 1 < h ? ((iy + 1) * w + ix) * 4 : idx;
  const idxE = ix + 1 < w ? (iy * w + ix + 1) * 4 : idx;
  const idxNE = ix + 1 < w && iy + 1 < h ? ((iy + 1) * w + ix + 1) * 4 : idx;

  return {
    r: nw * pixels[idx] + ne * pixels[idxE] + sw * pixels[idxN] + se * pixels[idxNE],
    g: nw * pixels[idx + 1] + ne * pixels[idxE + 1] + sw * pixels[idxN + 1] + se * pixels[idxNE + 1],
    b: nw * pixels[idx + 2] + ne * pixels[idxE + 2] + sw * pixels[idxN + 2] + se * pixels[idxNE + 2],
    a: nw * pixels[idx + 3] + ne * pixels[idxE + 3] + sw * pixels[idxN + 3] + se * pixels[idxNE + 3],
  };
}
