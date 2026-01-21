/**
 * Risk Gauge Export Helpers
 * Task: T033 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Helper functions extracted from riskGaugeExporter for file size compliance.
 */

/**
 * Export SVG element as SVG file
 *
 * @param svgElement - SVG element to export
 * @param filename - Target filename
 */
export async function exportSVG(svgElement: SVGSVGElement, filename: string): Promise<void> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

/**
 * Export SVG element as PNG image
 *
 * @param svgElement - SVG element to export
 * @param filename - Target filename
 * @param quality - Image quality (0-1)
 * @param scale - Scale factor
 * @param backgroundColor - Background color (hex)
 */
export async function exportPNG(
  svgElement: SVGSVGElement,
  filename: string,
  quality: number,
  scale: number,
  backgroundColor: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const svgRect = svgElement.getBoundingClientRect();
  canvas.width = svgRect.width * scale;
  canvas.height = svgRect.height * scale;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Convert SVG to image
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });

  canvas.toBlob(
    (blob) => {
      if (blob) {
        downloadBlob(blob, filename);
      }
    },
    'image/png',
    quality
  );
}

/**
 * Build filename with timestamp and extension
 *
 * @param base - Base filename
 * @param format - File format extension
 * @param includeTimestamp - Whether to include timestamp
 * @returns Complete filename with extension
 */
export function buildFilename(base: string, format: string, includeTimestamp: boolean): string {
  let filename = base;

  if (includeTimestamp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    filename = `${base}-${timestamp}`;
  }

  return `${filename}.${format}`;
}

/**
 * Download blob as file
 *
 * @param blob - Blob to download
 * @param filename - Target filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
