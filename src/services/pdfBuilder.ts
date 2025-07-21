import { type FileEntry } from '../types';
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Path to a mono-spaced Unicode font placed in /public/fonts
 * (any TTF/OTF with a permissive licence will work).
 */
const FONT_URL = '../../public/fonts/JetBrainsMono-Regular.ttf';

/**
 * Creates a single selectable PDF that contains the entire code-base.
 * Handles full-Unicode input by embedding JetBrains Mono.
 */
export async function buildPdf(files: FileEntry[]): Promise<Blob> {
    // ─── prepare document & font ──────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const fontBytes = await fetch(FONT_URL).then((r) => r.arrayBuffer());
    const mono = await pdfDoc.embedFont(fontBytes, { subset: true }); // Unicode-capable!

    // ─── layout constants ────────────────────────────────────────────────
    const fontSizeHeader = 10;
    const fontSizeCode = 8;
    const lineHeightHeader = fontSizeHeader * 1.4;
    const lineHeightCode = fontSizeCode * 1.2;
    const margin = 40;

    let page = pdfDoc.addPage();
    const { width: pageW, height: pageH } = page.getSize();
    let cursorY = pageH - margin;

    // header on first page
    drawHeader(page, mono, fontSizeHeader, margin, cursorY);
    cursorY -= lineHeightHeader;

    // compute wrap width
    const charW = mono.widthOfTextAtSize('M', fontSizeCode);
    const maxCharsPerLine = Math.floor((pageW - margin * 2) / charW);

    const newPage = () => {
        page = pdfDoc.addPage();
        drawHeader(page, mono, fontSizeHeader, margin, pageH - margin);
        cursorY = pageH - margin - lineHeightHeader;
    };

    // ─── iterate over every file ─────────────────────────────────────────
    for (const file of files) {
        // room for file header?
        if (cursorY - lineHeightHeader < margin) newPage();

        page.drawText(file.path, {
            x: margin,
            y: cursorY,
            size: fontSizeHeader,
            font: mono,
            color: rgb(0, 0, 0),
        });
        cursorY -= lineHeightHeader;

        // read file text (catch keeps pipeline alive even if one read fails)
        const raw = await file
            .getText()
            .catch(
                (e) =>
                    `[Error reading file: ${e instanceof Error ? e.message : String(e)}]`,
            );

        for (const logicalLine of raw.split(/\r?\n/)) {
            const wrapped = hardWrap(logicalLine === '' ? ' ' : logicalLine, maxCharsPerLine);
            for (const vis of wrapped) {
                if (cursorY - lineHeightCode < margin) newPage();
                page.drawText(vis, {
                    x: margin,
                    y: cursorY,
                    size: fontSizeCode,
                    font: mono,
                    color: rgb(0, 0, 0),
                });
                cursorY -= lineHeightCode;
            }
        }
        cursorY -= lineHeightCode; // extra gap between files
    }

    // ─── finalise ────────────────────────────────────────────────────────
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
}

/* ───────────────────────── helpers ───────────────────────── */

function hardWrap(text: string, width: number): string[] {
    if (text.length <= width) return [text];
    const out: string[] = [];
    for (let i = 0; i < text.length; i += width) {
        out.push(text.slice(i, i + width));
    }
    return out;
}

function drawHeader(
    page: import('pdf-lib').PDFPage,
    font: import('pdf-lib').PDFFont,
    size: number,
    x: number,
    y: number,
) {
    page.drawText(`Codebase Export – ${new Date().toLocaleDateString()}`, {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
    });
}
