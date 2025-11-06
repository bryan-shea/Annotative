import * as vscode from 'vscode';

/**
 * Tree item representing a folder containing files with annotations
 */
export class AnnotationFolderItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly files: string[],
        public readonly totalCount: number,
        public readonly unresolvedCount: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.tooltip = `${totalCount} total annotations, ${unresolvedCount} unresolved`;
        this.description = `${unresolvedCount}/${totalCount}`;
        this.contextValue = 'annotationFolder';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}
