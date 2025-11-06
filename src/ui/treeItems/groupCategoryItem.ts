import * as vscode from 'vscode';
import { Annotation } from '../../types';

/**
 * Tree item representing a group of annotations (by tag, status, priority, etc.)
 */
export class GroupCategoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly annotations: Annotation[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.contextValue = 'annotationGroup';
        this.iconPath = new vscode.ThemeIcon('folder-outline');
    }
}
