import React, { useCallback, useMemo, useState, type ChangeEventHandler } from 'react';
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import ignore from 'ignore';
import { buildTxt } from '../services/txtBuilder';
import { buildPdf } from '../services/pdfBuilder';
import { downloadBlob } from '../utils/download';
import { isCodeFile } from '../utils/fileFilters';
import { buildTree, type TreeNode } from '../utils/treeBuilder';
import FileTree from './FileTree';
import { type FileEntry } from '../types';
import { formatFileSize } from "../utils/format";

interface UploadedFile {
    fle: File;
    path: string;
    size: number;
}

/* 50 MB limit applied AFTER filtering / selection */
const MAX_EXPORT_SIZE = 50 * 1024 * 1024;

const CodebaseParser: React.FC = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [gitignoreApplied, setGitignoreApplied] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [txtBlob, setTxtBlob] = useState<Blob | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [txtPreview, setTxtPreview] = useState<string>('');

    /* ───────────────────────── helpers ───────────────────────── */
    const getSelectedSize = () =>
        files
            .filter((f) => selectedFiles.has(f.path))
            .reduce((sum, f) => sum + f.size, 0);

    const exportTooLarge = getSelectedSize() > MAX_EXPORT_SIZE;

    /* ─────────────────── folder upload & filtering ────────────── */
    const scanFolder = useCallback(
        async (fileList: FileList): Promise<UploadedFile[]> => {
            const arr = Array.from(fileList);

            /* Detect root folder name (first segment before the slash) */
            const firstFile = arr[0] as File & { webkitRelativePath?: string };
            const firstPath = firstFile.webkitRelativePath ?? '';
            const baseDir = firstPath ? firstPath.split('/')[0] : '';

            /* Read every .gitignore we find */
            const igFileCandidates = arr.filter((f) => f.name === '.gitignore');
            let ig: ReturnType<typeof ignore> | null = null;
            if (igFileCandidates.length) {
                ig = ignore();
                for (const f of igFileCandidates) {
                    ig.add(await f.text());
                }
            }
            setGitignoreApplied(Boolean(ig));

            /* Build cleaned list */
            const clean: UploadedFile[] = [];

            for (const file of arr) {
                const f = file as File & { webkitRelativePath?: string };

                const originalPath = f.webkitRelativePath ?? f.name;
                const normalized = originalPath.replaceAll('\\', '/');

                /* Path relative to project root (for ignore matching) */
                const relPath = baseDir
                    ? normalized.split('/').slice(1).join('/')
                    : normalized;

                if (ig?.ignores(relPath)) continue;      // .gitignore exclusion
                if (!isCodeFile(f.name)) continue;       // fallback extension filter

                clean.push({ fle: f, path: normalized, size: f.size });
            }

            /* Sort for nicer UI */
            clean.sort((a, b) => a.path.localeCompare(b.path));
            return clean;
        },
        [],
    );

    const handleFolderUpload: ChangeEventHandler<HTMLInputElement> = useCallback(
        async (e) => {
            const fl = e.target.files;
            if (!fl || fl.length === 0) return;

            const clean = await scanFolder(fl);

            setFiles(clean);
            setSelectedFiles(new Set(clean.map((f) => f.path)));
            setTxtBlob(null);
            setPdfBlob(null);
            setTxtPreview('');
        },
        [scanFolder],
    );

    /* ───────────────────── selection helpers ──────────────────── */
    const toggleFile = (path: string) => {
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const toggleFolder = (paths: string[], select: boolean) => {
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            paths.forEach((p) => {
                if (select) next.add(p);
                else next.delete(p);
            });
            return next;
        });
    };

    const selectAll = () => setSelectedFiles(new Set(files.map((f) => f.path)));
    const deselectAll = () => setSelectedFiles(new Set());

    /* ───────────────────────── documents ──────────────────────── */
    const generateDocuments = async () => {
        if (exportTooLarge || selectedFiles.size === 0) return;

        setIsProcessing(true);

        const entries: FileEntry[] = files
            .filter((f) => selectedFiles.has(f.path))
            .map((f) => ({
                path: f.path,
                size: f.size,
                getText: () => f.fle.text(),
            }));

        /* TXT first – quick and gives preview */
        const { blob: txtB, text } = await buildTxt(entries);
        setTxtBlob(txtB);
        setTxtPreview(text);

        /* Then PDF */
        const pdfB = await buildPdf(entries);
        setPdfBlob(pdfB);

        setIsProcessing(false);
    };

    /* ───────────────────────── derived data ───────────────────── */
    const tree: TreeNode[] = useMemo(() => buildTree(files), [files]);

    /* ───────────────────────────── UI ─────────────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        Codebase Parser & Document Generator
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Convert an entire project into TXT &amp; PDF for LLMs
                    </p>
                </header>

                {/* ─────────── Upload ─────────── */}
                <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <Upload className="mx-auto h-16 w-16 text-blue-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Upload Your Project Folder
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Export size limit: 50 MB (enforced after filtering)
                        </p>
                        <input
                            type="file"
                            /* @ts-expect-error – non-standard attribute for folder upload */
                            webkitdirectory=""
                            directory=""
                            multiple
                            onChange={handleFolderUpload}
                            className="hidden"
                            id="folder-upload"
                        />
                        <label
                            htmlFor="folder-upload"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                        >
                            Select Folder
                        </label>
                    </div>
                </section>

                {/* ─────────── File tree & selection ─────────── */}
                {files.length > 0 && (
                    <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
                        <header className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Select Files to Include
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={selectAll}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={deselectAll}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </header>

                        {/* Selection summary */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-800">
                  Selection Summary
                </span>
                            </div>
                            <p className="text-blue-700">
                                Selected: {selectedFiles.size} files&nbsp;|&nbsp;Size:{' '}
                                {formatFileSize(getSelectedSize())} /{' '}
                                {formatFileSize(MAX_EXPORT_SIZE)}
                            </p>
                            {gitignoreApplied && (
                                <p className="text-xs text-blue-600 mt-1">
                                    .gitignore rules were applied automatically
                                </p>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                            <FileTree
                                nodes={tree}
                                selected={selectedFiles}
                                onToggleFile={toggleFile}
                                onToggleFolder={toggleFolder}
                            />
                        </div>

                        {/* Error if over 50 MB */}
                        {exportTooLarge && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Selected files exceed the 50 MB export limit. Trim your
                                selection or update .gitignore.
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <button
                                onClick={generateDocuments}
                                disabled={
                                    isProcessing || selectedFiles.size === 0 || exportTooLarge
                                }
                                className="inline-flex items-center px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                ) : (
                                    <FileText className="h-5 w-5 mr-2" />
                                )}
                                {isProcessing ? 'Processing…' : 'Generate Documents'}
                            </button>
                        </div>
                    </section>
                )}

                {/* ─────────── Results ─────────── */}
                {txtBlob && pdfBlob && (
                    <section className="bg-white rounded-xl shadow-lg p-8">
                        <header className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Generated Documents
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => downloadBlob(txtBlob, 'codebase.txt')}
                                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download TXT
                                </button>
                                <button
                                    onClick={() => downloadBlob(pdfBlob, 'codebase.pdf')}
                                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </button>
                            </div>
                        </header>

                        <div className="mb-4 p-4 bg-green-50 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-green-800">
                Successfully processed {selectedFiles.size} files (
                                {formatFileSize(getSelectedSize())})
              </span>
                        </div>

                        <div className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {txtPreview.substring(0, 2000)}
                  {txtPreview.length > 2000 && '\n\n… [truncated]'}
              </pre>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default CodebaseParser;