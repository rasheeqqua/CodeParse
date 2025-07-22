import { jsPDF } from 'jspdf';
import { type FileEntry } from '../types';

/**
 * IMPORTANT: a Unicode-capable monospace font (e.g. JetBrains Mono) must
 * exist in /public/fonts.  Download the .ttf once and drop it there:
 *
 *   public/fonts/JetBrainsMono-Regular.ttf
 *
 * Any font with an open licence will work.
 */
const FONT_URL = '/fonts/JetBrainsMono-Regular.ttf';

/** convert ArrayBuffer → base-64 string required by jsPDF.addFileToVFS */
function bufToB64(buf: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Hard-wrap one logical line into N visual lines */
function hardWrap(line: string, maxChars: number): string[] {
    if (line.length <= maxChars) return [line];
    const out: string[] = [];
    for (let i = 0; i < line.length; i += maxChars) {
        out.push(line.slice(i, i + maxChars));
    }
    return out;
}

/**
 * Build a full-Unicode, selectable PDF with jsPDF.
 * Returns a Blob ready for download.
 */
export async function buildPdf(files: FileEntry[]): Promise<Blob> {
    /* ── 1. prepare document & embed font ────────────────────────────── */
    const doc = new jsPDF({ unit: 'pt', format: 'a4' }); // pt = PostScript points
    const fontBytes = await fetch(FONT_URL).then((r) => r.arrayBuffer());
    doc.addFileToVFS('JetBrainsMono-Regular.ttf', bufToB64(fontBytes));
    doc.addFont('JetBrainsMono-Regular.ttf', 'JetBrainsMono', 'normal');
    doc.setFont('JetBrainsMono', 'normal');

    /* ── 2. layout constants ─────────────────────────────────────────── */
    const margin = 40;
    const headerSize = 10;
    const codeSize = 8;
    const headerLH = headerSize * 1.4;
    const codeLH = codeSize * 1.2;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const effectiveW = pageW - margin * 2;
    let y = margin;

    const printHeader = () => {
        doc.setFontSize(headerSize);
        doc.text(
            `Codebase Export – ${new Date().toLocaleDateString()}`,
            margin,
            y,
        );
        y += headerLH;
    };

    printHeader(); // first page header
    doc.setFontSize(codeSize);

    /* ── 3. pre-compute wrap width in characters (monospace!) ────────── */
    const charW = doc.getTextWidth('M'); // width of one monospace glyph
    const maxCharsPerLine = Math.floor(effectiveW / charW);

    const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
            doc.addPage();
            y = margin;
            printHeader();
            doc.setFontSize(codeSize);
        }
    };

    /* ── 4. iterate through every selected file ──────────────────────── */
    for (const file of files) {
        /* file header */
        ensureSpace(headerLH);
        doc.setFontSize(headerSize);
        doc.text(file.path, margin, y);
        y += headerLH;
        doc.setFontSize(codeSize);

        /* file content */
        const raw = await file
            .getText()
            .catch(
                (e) =>
                    `[Error reading file: ${e instanceof Error ? e.message : String(e)}]`,
            );

        for (const logical of raw.split(/\r?\n/)) {
            const visualLines = hardWrap(
                logical === '' ? ' ' : logical,
                maxCharsPerLine,
            );

            for (const vis of visualLines) {
                ensureSpace(codeLH);
                doc.text(vis, margin, y);
                y += codeLH;
            }
        }
        y += codeLH; // gap between files
    }

    /* ── 5. done ─────────────────────────────────────────────────────── */
    return doc.output('blob');
}