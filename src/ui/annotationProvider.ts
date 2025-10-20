import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationManager } from '../annotationManager';

export type TreeItem = AnnotationItem | AnnotationFileItem;

export class AnnotationProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private annotationManager: AnnotationManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // Root level - show files with annotations
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const fileGroups = new Map<string, Annotation[]>();

            allAnnotations.forEach(annotation => {
                if (!fileGroups.has(annotation.filePath)) {
                    fileGroups.set(annotation.filePath, []);
                }
                fileGroups.get(annotation.filePath)!.push(annotation);
            });

            const fileItems: TreeItem[] = [];
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

            return Promise.resolve(fileItems);
        } else if (element instanceof AnnotationFileItem) {
            // Show annotations for the file
            const annotations = this.annotationManager.getAnnotationsForFile(element.filePath);
            const annotationItems = annotations.map(annotation =>
                new AnnotationItem(
                    annotation,
                    vscode.TreeItemCollapsibleState.None
                )
            );
            return Promise.resolve(annotationItems);
        }

        return Promise.resolve([]);
    }
}

export class AnnotationItem extends vscode.TreeItem {
    constructor(
        public readonly annotation: Annotation,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        const statusIcon = annotation.resolved ? '✅' : '🔍';
        const preview = annotation.comment.length > 50
            ? annotation.comment.substring(0, 47) + '...'
            : annotation.comment;

        super(`${statusIcon} Line ${annotation.range.start.line + 1}: ${preview}`, collapsibleState);

        this.tooltip = `${annotation.comment}\n\nAuthor: ${annotation.author}\nDate: ${annotation.timestamp.toLocaleString()}`;
        this.description = annotation.author;
        this.contextValue = annotation.resolved ? 'resolvedAnnotation' : 'unresolvedAnnotation';

        // Command to navigate to the annotation
        this.command = {
            command: 'annotative.goToAnnotation',
            title: 'Go to Annotation',
            arguments: [annotation]
        };
    }
}

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