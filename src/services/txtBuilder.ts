import { type FileEntry } from '../types';

export interface TxtBuildResult {
    blob: Blob;
    text: string;
}

/** Builds a single fence-delimited TXT concatenation of all selected files */
export async function buildTxt(files: FileEntry[]): Promise<TxtBuildResult> {
    const pieces: string[] = [];

    for (const file of files) {
        const content = await file
            .getText()
            .catch(
                (e) =>
                    `[Error reading file: ${e instanceof Error ? e.message : String(e)}]`,
            );

        pieces.push(`\`\`\`${file.path}\n${content}\n\`\`\`\n\n`);
    }

    const text = pieces.join('');
    return {
        text,
        blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
    };
}