import { Injectable } from '@nestjs/common';

// mupdf is ESM-only; this keeps a real dynamic import() when TypeScript compiles to CommonJS.
const dynamicImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;

/** Renders each PDF page to a JPEG, one at a time, so memory stays bounded for large books. */
@Injectable()
export class PdfProcessor {
  async renderPages(pdf: Buffer, onPage: (pageNumber: number, jpeg: Buffer) => Promise<void>): Promise<number> {
    const mupdf = await dynamicImport('mupdf');
    const scale = Number(process.env.PAGE_RENDER_SCALE) || 1.8;
    const quality = Number(process.env.PAGE_JPEG_QUALITY) || 82;

    const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
    try {
      if (doc.needsPassword?.()) throw new Error('PDF is password protected');
      const total: number = doc.countPages();
      if (total < 1) throw new Error('PDF has no pages');
      for (let i = 0; i < total; i++) {
        const page = doc.loadPage(i);
        const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
        try {
          await onPage(i + 1, Buffer.from(pixmap.asJPEG(quality, false)));
        } finally {
          pixmap.destroy();
          page.destroy();
        }
      }
      return total;
    } finally {
      doc.destroy();
    }
  }
}
