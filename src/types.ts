export interface FileEntry {
    /** Relative path in the uploaded project (e.g. "./src/index.ts") */
    path: string;
    /** Size in bytes */
    size: number;
    /** Lazy reader – returns UTF-8 text of the file */
    getText: () => Promise<string>;
}