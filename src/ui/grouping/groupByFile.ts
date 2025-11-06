import * as vscode from 'vscode';
import { Annotation } from '../../types';
import { AnnotationFileItem, GroupCategoryItem } from '../treeItems';

/**
 * Groups annotations by file
 */
export function groupByFile(annotations: Annotation[]): (AnnotationFileItem | GroupCategoryItem)[] {
    const fileGroups = new Map<string, Annotation[]>();

    annotations.forEach(annotation => {
        if (!fileGroups.has(annotation.filePath)) {
            fileGroups.set(annotation.filePath, []);
        }
        fileGroups.get(annotation.filePath)!.push(annotation);
    });

    const fileItems: AnnotationFileItem[] = [];
    fileGroups.forEach((annotations, filePath) => {
        const unresolvedCount = annotations.filter(a => !a.resolved).length;
        const relativePath = vscode.workspace.asRelativePath(filePath);

        fileItems.push(new AnnotationFileItem(
            relativePath,
            filePath,
            annotations.length,
            unresolvedCount,
            vscode.TreeItemCollapsibleState.Expanded
        ));
    });

    return fileItems;
}
