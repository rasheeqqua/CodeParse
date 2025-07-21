import React, { useCallback, useState } from 'react';
import { Download, Upload, FileText, AlertCircle, CheckCircle2, File } from 'lucide-react';

import { buildTxt } from '../services/txtBuilder';
import { buildPdf } from '../services/pdfBuilder';
import { downloadBlob } from '../utils/download';
import { type FileEntry } from '../types';

interface UploadedFile {
    /** Native File object */
    file: File;
    /** Relative path within the folder upload */
    path: string;
    size: number;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const CodebaseParser: React.FC = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    const [txtBlob, setTxtBlob] = useState<Blob | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [txtPreview, setTxtPreview] = useState<string>('');

    /* ────────────────────────── helpers ────────────────────────── */
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const units = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
    };

    const isCodeFile = (fileName: string) => {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift','.kt', '.scala', '.r', '.sql', '.html', '.css', '.scss',
            '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.sh', '.bat', '.ps1', '.dockerfile',
            '.gitignore', '.env', '.config', '.ini', '.conf', '.lock'
        ];
        return (
            codeExtensions.some((ext) => fileName.toLowerCase().endsWith(ext)) ||
            !fileName.includes('.') // files like "Dockerfile", "Makefile"
        );
    };

    /* ─────────────────────── folder upload ─────────────────────── */
    const handleFolderUpload: React.ChangeEventHandler<HTMLInputElement> =
        useCallback((e) => {
            const fileList = Array.from(e.target.files ?? []);
            if (!fileList.length) return;

            let total = 0;
            const clean: UploadedFile[] = [];

            fileList.forEach((f) => {
                if (isCodeFile(f.name)) {
                    total += f.size;
                    clean.push({
                        file: f,
                        path: (f as any).webkitRelativePath || f.name,
                        size: f.size,
                    });
                }
            });

            if (total > MAX_SIZE) {
                alert(
                    `Total size (${formatFileSize(
                        total,
                    )}) exceeds 50 MB. Please select a smaller subset.`,
                );
                return;
            }

            setFiles(clean);
            setSelectedFiles(new Set(clean.map((f) => f.path)));
            setTxtBlob(null);
            setPdfBlob(null);
            setTxtPreview('');
        }, []);

    /* ─────────────────────── selection toggles ─────────────────────── */
    const toggleFile = (path: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setSelectedFiles(newSet);
    };

    const selectAll = () => setSelectedFiles(new Set(files.map((f) => f.path)));
    const deselectAll = () => setSelectedFiles(new Set());

    const getSelectedSize = () =>
        files
            .filter((f) => selectedFiles.has(f.path))
            .reduce((sum, f) => sum + f.size, 0);

    /* ─────────────────────── generators ─────────────────────── */
    const generateDocuments = async () => {
        if (selectedFiles.size === 0) {
            alert('Please select at least one file.');
            return;
        }

        setIsProcessing(true);

        const entries: FileEntry[] = files
            .filter((f) => selectedFiles.has(f.path))
            .map((f) => ({
                path: f.path,
                size: f.size,
                getText: () => f.file.text(),
            }));

        // Build TXT first (gives us preview text)
        const { blob: txtB, text } = await buildTxt(entries);
        setTxtBlob(txtB);
        setTxtPreview(text);

        // Build PDF (takes longer)
        const pdfB = await buildPdf(entries);
        setPdfBlob(pdfB);

        setIsProcessing(false);
    };

    /* ───────────────────────── UI start ───────────────────────── */
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

                {/* ───── Upload section ───── */}
                <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <Upload className="mx-auto h-16 w-16 text-blue-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Upload Your Project Folder
                        </h3>
                        <p className="text-gray-500 mb-4">Maximum size: 50 MB</p>
                        <input
                            type="file"
                            /* @ts-ignore – non-standard attribute for folder upload */
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

                {/* ───── File selection list ───── */}
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

                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-800">
                  Selection Summary
                </span>
                            </div>
                            <p className="text-blue-700">
                                Selected: {selectedFiles.size} files | Size:{' '}
                                {formatFileSize(getSelectedSize())} / {formatFileSize(MAX_SIZE)}
                            </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                            {files.map((f) => {
                                const isSel = selectedFiles.has(f.path);
                                const parts = f.path.split('/');
                                const fileName = parts.pop() ?? f.path;
                                const dir = parts.join('/');
                                return (
                                    <div
                                        key={f.path}
                                        className={`flex items-center p-3 border-b hover:bg-gray-50 ${
                                            isSel ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mr-3 h-4 w-4 text-blue-600"
                                            checked={isSel}
                                            onChange={() => toggleFile(f.path)}
                                        />
                                        <File className="h-4 w-4 text-gray-500 mr-2" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {fileName}
                        </span>
                                                <span className="text-xs text-gray-500">
                          ({formatFileSize(f.size)})
                        </span>
                                            </div>
                                            {dir && (
                                                <div className="text-sm text-gray-500">{dir}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={generateDocuments}
                                disabled={isProcessing || selectedFiles.size === 0}
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

                {/* ───── Results ───── */}
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