import * as vscode from 'vscode';
import { Annotation } from '../../types';
import { GroupCategoryItem } from '../treeItems';

/**
 * Groups annotations by resolution status (open/resolved)
 */
export function groupByStatus(annotations: Annotation[]): GroupCategoryItem[] {
    const openAnnotations = annotations.filter(a => !a.resolved);
    const resolvedAnnotations = annotations.filter(a => a.resolved);

    const statusItems: GroupCategoryItem[] = [];

    if (openAnnotations.length > 0) {
        statusItems.push(new GroupCategoryItem(
            `Open (${openAnnotations.length})`,
            openAnnotations,
            vscode.TreeItemCollapsibleState.Expanded
        ));
    }

    if (resolvedAnnotations.length > 0) {
        statusItems.push(new GroupCategoryItem(
            `Resolved (${resolvedAnnotations.length})`,
            resolvedAnnotations,
            vscode.TreeItemCollapsibleState.Expanded
        ));
    }

    if (statusItems.length === 0) {
        statusItems.push(new GroupCategoryItem(
            'No annotations',
            [],
            vscode.TreeItemCollapsibleState.None
        ));
    }

    return statusItems;
}
