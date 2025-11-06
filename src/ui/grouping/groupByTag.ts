import * as vscode from 'vscode';
import { Annotation } from '../../types';
import { GroupCategoryItem } from '../treeItems';

/**
 * Groups annotations by tag
 */
export function groupByTag(annotations: Annotation[]): GroupCategoryItem[] {
    const tagGroups = new Map<string, Annotation[]>();
    const untaggedAnnotations: Annotation[] = [];

    annotations.forEach(annotation => {
        if (!annotation.tags || annotation.tags.length === 0) {
            untaggedAnnotations.push(annotation);
        } else {
            annotation.tags.forEach(tag => {
                const tagId = typeof tag === 'string' ? tag : tag.id;
                if (!tagGroups.has(tagId)) {
                    tagGroups.set(tagId, []);
                }
                tagGroups.get(tagId)!.push(annotation);
            });
        }
    });

    const tagItems: GroupCategoryItem[] = [];

    // Add tagged groups
    Array.from(tagGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([tag, anns]) => {
            tagItems.push(new GroupCategoryItem(
                `${tag} (${anns.length})`,
                anns,
                vscode.TreeItemCollapsibleState.Expanded
            ));
        });

    // Add untagged group if there are any
    if (untaggedAnnotations.length > 0) {
        tagItems.push(new GroupCategoryItem(
            `Untagged (${untaggedAnnotations.length})`,
            untaggedAnnotations,
            vscode.TreeItemCollapsibleState.Expanded
        ));
    }

    return tagItems;
}
