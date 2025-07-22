export interface FileEntry {
    path: string;                     // relative file-path in the project
    size: number;                     // length in bytes
    getText: () => Promise<string>;   // lazy UTF-8 reader
}