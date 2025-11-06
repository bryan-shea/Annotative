import * as vscode from 'vscode';
import { Annotation } from '../../types';
import { GroupCategoryItem } from '../treeItems';

/**
 * Groups annotations by priority level
 */
export function groupByPriority(annotations: Annotation[]): GroupCategoryItem[] {
    const priorityGroups: { [key: string]: Annotation[] } = {
        'Critical': [],
        'High': [],
        'Medium': [],
        'Low': [],
        'Unset': []
    };

    annotations.forEach(annotation => {
        const priority = annotation.priority || 'Unset';
        if (priorityGroups[priority]) {
            priorityGroups[priority].push(annotation);
        } else {
            priorityGroups['Unset'].push(annotation);
        }
    });

    const priorityItems: GroupCategoryItem[] = [];
    const priorityOrder = ['Critical', 'High', 'Medium', 'Low', 'Unset'];

    priorityOrder.forEach(priority => {
        if (priorityGroups[priority].length > 0) {
            priorityItems.push(new GroupCategoryItem(
                `${priority} (${priorityGroups[priority].length})`,
                priorityGroups[priority],
                vscode.TreeItemCollapsibleState.Expanded
            ));
        }
    });

    return priorityItems;
}
