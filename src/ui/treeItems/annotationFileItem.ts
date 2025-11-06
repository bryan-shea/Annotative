import * as vscode from 'vscode';

/**
 * Tree item representing a file with annotations
 */
export class AnnotationFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly totalCount: number,
        public readonly unresolvedCount: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.tooltip = `${totalCount} total annotations, ${unresolvedCount} unresolved`;
        this.description = `${unresolvedCount}/${totalCount}`;
        this.contextValue = 'annotationFile';
        this.iconPath = new vscode.ThemeIcon('file-code');
    }
}
