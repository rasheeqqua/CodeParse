/* List of extensions that are treated as “code” when no .gitignore is supplied */
export const codeExtensions: string[] = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.sql',
    '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml',
    '.yml', '.md', '.txt', '.sh', '.bat', '.ps1', '.dockerfile', '.gitignore',
    '.env', '.config', '.ini', '.conf', '.lock'
];

export function isCodeFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return (
        codeExtensions.some((ext) => lower.endsWith(ext)) ||
        !fileName.includes('.') // names like "Dockerfile", "Makefile"
    );
}