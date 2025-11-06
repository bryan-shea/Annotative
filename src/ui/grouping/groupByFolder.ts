import * as vscode from 'vscode';
import { Annotation } from '../../types';
import { AnnotationFolderItem } from '../treeItems';

/**
 * Groups annotations by folder structure
 */
export function groupByFolder(annotations: Annotation[]): AnnotationFolderItem[] {
    const folderMap = new Map<string, Set<string>>();
    const folderAnnotationMap = new Map<string, Annotation[]>();

    // Build folder structure
    annotations.forEach(annotation => {
        const parts = annotation.filePath.split(/[\\/]/);
        let folderPath = '';

        for (let i = 0; i < parts.length - 1; i++) {
            if (i === 0) {
                folderPath = parts[i];
            } else {
                folderPath = `${folderPath}/${parts[i]}`;
            }

            if (!folderMap.has(folderPath)) {
                folderMap.set(folderPath, new Set());
                folderAnnotationMap.set(folderPath, []);
            }

            folderMap.get(folderPath)!.add(annotation.filePath);
            const folder = folderAnnotationMap.get(folderPath)!;
            if (!folder.some(a => a.id === annotation.id)) {
                folder.push(annotation);
            }
        }
    });

    // Create folder items
    const folderItems: AnnotationFolderItem[] = [];
    const rootFolders = new Map<string, string[]>();

    folderMap.forEach((files, folderPath) => {
        const rootFolder = folderPath.split(/[\\/]/)[0];
        if (!rootFolders.has(rootFolder)) {
            rootFolders.set(rootFolder, []);
        }
        rootFolders.get(rootFolder)!.push(folderPath);
    });

    rootFolders.forEach((subFolders, rootFolder) => {
        const allFiles = new Set<string>();
        subFolders.forEach(folder => {
            folderMap.get(folder)?.forEach(file => allFiles.add(file));
        });

        const unresolvedCount = Array.from(allFiles).reduce((count, filePath) => {
            return count + (annotations.filter(a => a.filePath === filePath && !a.resolved).length);
        }, 0);

        folderItems.push(new AnnotationFolderItem(
            rootFolder,
            Array.from(allFiles),
            Array.from(allFiles).length,
            unresolvedCount,
            vscode.TreeItemCollapsibleState.Expanded
        ));
    });

    return folderItems.sort((a, b) => {
        const aLabel = a.label || '';
        const bLabel = b.label || '';
        return aLabel.localeCompare(bLabel);
    });
}
