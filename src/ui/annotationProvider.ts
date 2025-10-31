import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationManager } from '../annotationManager';

export type TreeItem = AnnotationItem | AnnotationFileItem;

export type FilterStatus = 'all' | 'unresolved' | 'resolved';
export type FilterTag = 'all' | string;

export class AnnotationProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private filterStatus: FilterStatus = 'all';
    private filterTag: FilterTag = 'all';
    private searchQuery: string = '';

    constructor(private annotationManager: AnnotationManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setFilterStatus(status: FilterStatus): void {
        this.filterStatus = status;
        this.refresh();
    }

    getFilterStatus(): FilterStatus {
        return this.filterStatus;
    }

    setFilterTag(tag: FilterTag): void {
        this.filterTag = tag;
        this.refresh();
    }

    getFilterTag(): FilterTag {
        return this.filterTag;
    }

    setSearchQuery(query: string): void {
        this.searchQuery = query.toLowerCase();
        this.refresh();
    }

    getSearchQuery(): string {
        return this.searchQuery;
    }

    clearFilters(): void {
        this.filterStatus = 'all';
        this.filterTag = 'all';
        this.searchQuery = '';
        this.refresh();
    }

    private filterAnnotations(annotations: Annotation[]): Annotation[] {
        return annotations.filter(annotation => {
            // Filter by status
            if (this.filterStatus === 'resolved' && !annotation.resolved) {
                return false;
            }
            if (this.filterStatus === 'unresolved' && annotation.resolved) {
                return false;
            }

            // Filter by tag
            if (this.filterTag !== 'all') {
                if (!annotation.tags || !annotation.tags.includes(this.filterTag)) {
                    return false;
                }
            }

            // Filter by search query
            if (this.searchQuery) {
                const searchLower = this.searchQuery;
                const commentMatch = annotation.comment.toLowerCase().includes(searchLower);
                const textMatch = annotation.text.toLowerCase().includes(searchLower);
                const authorMatch = annotation.author.toLowerCase().includes(searchLower);
                const tagMatch = annotation.tags?.some(tag => tag.toLowerCase().includes(searchLower));

                if (!commentMatch && !textMatch && !authorMatch && !tagMatch) {
                    return false;
                }
            }

            return true;
        });
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // Root level - show files with annotations
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const filteredAnnotations = this.filterAnnotations(allAnnotations);
            const fileGroups = new Map<string, Annotation[]>();

            filteredAnnotations.forEach(annotation => {
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
            const filteredAnnotations = this.filterAnnotations(annotations);
            const annotationItems = filteredAnnotations.map(annotation =>
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
        const statusIcon = annotation.resolved ? '[Resolved]' : '[Open]';
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