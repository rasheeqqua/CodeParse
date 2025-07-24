export interface TreeNode {
    name: string;
    path: string;
    type: 'folder' | 'file';
    size?: number;
    children?: TreeNode[];
}

interface FileLike {
    path: string;
    size: number;
}

/* Build a folder/file hierarchy from a flat list of relative paths */
export function buildTree(files: FileLike[]): TreeNode[] {
    const root: TreeNode[] = [];

    for (const file of files) {
        const segments = file.path.split('/');
        let currentLevel = root;

        segments.forEach((segment, idx) => {
            const existing = currentLevel.find((n) => n.name === segment);

            if (idx === segments.length - 1) {
                /* Leaf node (file) */
                if (!existing) {
                    currentLevel.push({
                        name: segment,
                        path: file.path,
                        type: 'file',
                        size: file.size,
                    });
                }
            } else {
                /* Folder */
                let folder: TreeNode;
                if (existing && existing.type === 'folder') {
                    folder = existing;
                } else {
                    folder = {
                        name: segment,
                        path: segments.slice(0, idx + 1).join('/'),
                        type: 'folder',
                        children: [],
                    };
                    currentLevel.push(folder);
                }
                /* Descend */
                currentLevel = folder.children!;
            }
        });
    }

    /* Alphabetical sort (folders first) */
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach((n) => n.children && sortNodes(n.children));
    };
    sortNodes(root);

    return root;
}

/* Collect all descendant file paths for bulk-select operations */
export function collectFilePaths(node: TreeNode): string[] {
    if (node.type === 'file') return [node.path];
    return (node.children ?? []).flatMap(collectFilePaths);
}