import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { FileEntry } from '../types';

/* Build a Unicode-safe PDF and return it as a Blob */
export async function buildPdf(files: FileEntry[]): Promise<Blob> {
    /* ── 1.  Top-level title ─────────────────────────────────────────── */
    const content: Content[] = [
        {
            text: `Codebase Export – ${new Date().toLocaleDateString()}`,
            style: 'title',
            margin: [0, 0, 0, 12] as [number, number, number, number],
        },
    ];

    /* ── 2.  One section per file ────────────────────────────────────── */
    for (const file of files) {
        let fileText: string;
        try {
            fileText = await file.getText();
        } catch (e) {
            fileText = `[Error reading file: ${
                e instanceof Error ? e.message : String(e)
            }]`;
        }

        content.push(
            { text: file.path, style: 'fileHeader' },
            {
                text: fileText.length ? fileText : ' ',
                style: 'code',
                preserveLeadingSpaces: true,
            },
        );
    }

    /* ── 3.  Document definition ─────────────────────────────────────── */
    const docDef: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        defaultStyle: {
            font: 'Roboto',      // ← built-in font shipped with pdfmake
            fontSize: 8,
            lineHeight: 1.1,
        },
        footer: (current, total) => ({
            text: `${current} / ${total}`,
            alignment: 'right',
            margin: [0, 0, 40, 20],
            fontSize: 6,
        }),
        styles: {
            title:      { fontSize: 10, bold: true },
            fileHeader: { fontSize: 9, bold: true, margin: [0, 12, 0, 4] },
            code:       { fontSize: 8 },
        },
        content,
    };

    /* ── 4.  Create and return Blob ──────────────────────────────────── */
    return new Promise<Blob>((resolve, reject) => {
        pdfMake.createPdf(docDef).getBlob((blob) =>
            blob ? resolve(blob) : reject(new Error('PDF generation failed')),
        );
    });
}