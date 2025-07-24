import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    File as FileIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
} from 'lucide-react';
import { type TreeNode, collectFilePaths } from '../utils/treeBuilder';
import { formatFileSize } from "../utils/format";

interface FileTreeProps {
    nodes: TreeNode[];
    selected: Set<string>;
    onToggleFile: (path: string) => void;
    onToggleFolder: (paths: string[], select: boolean) => void;
}

/* ---------- change #1: TreeRowProps is now self-contained ---------- */
interface TreeRowProps {
    node: TreeNode;
    depth: number;
    selected: Set<string>;
    onToggleFile: (path: string) => void;
    onToggleFolder: (paths: string[], select: boolean) => void;
}

const INDENT_PX = 20;

const FileTree: React.FC<FileTreeProps> = ({
                                               nodes,
                                               selected,
                                               onToggleFile,
                                               onToggleFolder,
                                           }) => (
    <div>
        {nodes.map((n) => (
            <TreeRow
                key={n.path}
                node={n}
                depth={0}
                selected={selected}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
            />
        ))}
    </div>
);

export default FileTree;

const TreeRow: React.FC<TreeRowProps> = ({
                                             node,
                                             depth,
                                             selected,
                                             onToggleFile,
                                             onToggleFolder,
                                         }) => {
    const [isOpen, setIsOpen] = useState<boolean>(true);
    const checkboxRef = useRef<HTMLInputElement | null>(null);

    const descendantPaths = useMemo(() => collectFilePaths(node), [node]);
    const selectedCount = useMemo(
        () => descendantPaths.filter((p) => selected.has(p)).length,
        [descendantPaths, selected],
    );
    const allSelected = selectedCount === descendantPaths.length;
    const someSelected = selectedCount > 0 && !allSelected;

    useEffect(() => {
        if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected;
    }, [someSelected]);

    const handleFolderToggle = () => {
        onToggleFolder(descendantPaths, !allSelected);
    };
    const handleFileToggle = () => onToggleFile(node.path);

    return (
        <>
            <div
                className={`flex items-center py-1 px-2 hover:bg-gray-50 ${
                    node.type === 'folder' && 'font-medium'
                }`}
                style={{ paddingLeft: depth * INDENT_PX }}
            >
                {node.type === 'folder' ? (
                    <button
                        className="mr-1 text-gray-500 hover:text-gray-700"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                    >
                        {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                ) : (
                    <span className="mr-1" style={{ width: 16 }} />
                )}

                <input
                    ref={checkboxRef}
                    type="checkbox"
                    className="mr-2 h-4 w-4 text-blue-600"
                    checked={allSelected}
                    onChange={node.type === 'folder' ? handleFolderToggle : handleFileToggle}
                />

                {node.type === 'folder' ? (
                    isOpen ? (
                        <FolderOpenIcon className="h-4 w-4 text-amber-600 mr-2" />
                    ) : (
                        <FolderIcon className="h-4 w-4 text-amber-600 mr-2" />
                    )
                ) : (
                    <FileIcon className="h-4 w-4 text-gray-500 mr-2" />
                )}

                <span className="flex-1 break-all text-gray-800">{node.name}</span>
                {node.type === 'file' && (
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            {formatFileSize(node.size ?? 0)}
          </span>
                )}
            </div>

            {node.type === 'folder' &&
                isOpen &&
                (node.children ?? []).map((child) => (
                    /* ---------- change #2: nodes={[]}" removed ---------- */
                    <TreeRow
                        key={child.path}
                        node={child}
                        depth={depth + 1}
                        selected={selected}
                        onToggleFile={onToggleFile}
                        onToggleFolder={onToggleFolder}
                    />
                ))}
        </>
    );
};
