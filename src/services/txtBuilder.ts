import { type FileEntry } from '../types';

export interface TxtBuildResult {
    /** Blob ready for download */
    blob: Blob;
    /** UTF-8 string (used for on-screen preview) */
    text: string;
}

/**
 * Builds a single TXT file that concatenates every file of the code-base
 * in fenced blocks:  ```./path\n<content>\n```
 */
export async function buildTxt(files: FileEntry[]): Promise<TxtBuildResult> {
    const chunks: string[] = [];

    for (const file of files) {
        const content = await file
            .getText()
            .catch(
                (err) =>
                    `[Error reading file: ${
                        err instanceof Error ? err.message : String(err)
                    }]`,
            );

        chunks.push(`\`\`\`${file.path}\n${content}\n\`\`\`\n\n`);
    }

    const text = chunks.join('');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

    return { blob, text };
}