/**
 * Dashboard export utilities.
 *
 * PNG: captures the dashboard content area via html2canvas-pro.
 * PDF: triggers window.print() with @media print styles.
 *
 * @module export
 */

import html2canvas from 'html2canvas-pro';

// ---------------------------------------------------------------------------
// PNG export
// ---------------------------------------------------------------------------

/**
 * Capture a DOM element as a PNG and trigger download.
 *
 * @param element  The DOM element to capture.
 * @param filename Download filename (without extension).
 */
export async function exportToPNG(
  element: HTMLElement,
  filename = 'dashpersona-report',
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0f0d', // --bg-primary
    scale: 2, // retina quality
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.png`;
  link.click();
}

// ---------------------------------------------------------------------------
// PDF export (print-based)
// ---------------------------------------------------------------------------

/**
 * Trigger browser print dialog for PDF export.
 * Relies on @media print CSS rules in globals.css.
 */
export function exportToPDF(): void {
  window.print();
}
