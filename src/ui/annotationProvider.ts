import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationManager } from '../annotationManager';

export type TreeItem = AnnotationItem | AnnotationFileItem | GroupCategoryItem;

export type FilterStatus = 'all' | 'unresolved' | 'resolved';
export type FilterTag = 'all' | string;
export type GroupBy = 'file' | 'tag' | 'status';

export class AnnotationProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private filterStatus: FilterStatus = 'all';
    private filterTag: FilterTag = 'all';
    private searchQuery: string = '';
    private groupBy: GroupBy = 'file';
    private selectedAnnotationIds: Set<string> = new Set();

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

    setGroupBy(groupBy: GroupBy): void {
        this.groupBy = groupBy;
        this.refresh();
    }

    getGroupBy(): GroupBy {
        return this.groupBy;
    }

    clearFilters(): void {
        this.filterStatus = 'all';
        this.filterTag = 'all';
        this.searchQuery = '';
        this.refresh();
    }

    toggleAnnotationSelection(annotationId: string): void {
        if (this.selectedAnnotationIds.has(annotationId)) {
            this.selectedAnnotationIds.delete(annotationId);
        } else {
            this.selectedAnnotationIds.add(annotationId);
        }
    }

    selectAllAnnotations(): void {
        const allAnnotations = this.annotationManager.getAllAnnotations();
        const filtered = this.filterAnnotations(allAnnotations);
        filtered.forEach(ann => this.selectedAnnotationIds.add(ann.id));
    }

    deselectAllAnnotations(): void {
        this.selectedAnnotationIds.clear();
    }

    getSelectedAnnotations(): Annotation[] {
        const allAnnotations = this.annotationManager.getAllAnnotations();
        return allAnnotations.filter(ann => this.selectedAnnotationIds.has(ann.id));
    }

    getSelectedCount(): number {
        return this.selectedAnnotationIds.size;
    }

    isAnnotationSelected(annotationId: string): boolean {
        return this.selectedAnnotationIds.has(annotationId);
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
            // Root level - organize based on groupBy setting
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const filteredAnnotations = this.filterAnnotations(allAnnotations);

            if (this.groupBy === 'file') {
                return this.getChildrenGroupedByFile(filteredAnnotations);
            } else if (this.groupBy === 'tag') {
                return this.getChildrenGroupedByTag(filteredAnnotations);
            } else {
                return this.getChildrenGroupedByStatus(filteredAnnotations);
            }
        } else if (element instanceof AnnotationFileItem) {
            // Show annotations for the file
            const annotations = this.annotationManager.getAnnotationsForFile(element.filePath);
            const filteredAnnotations = this.filterAnnotations(annotations);
            const annotationItems = filteredAnnotations.map(annotation =>
                new AnnotationItem(
                    annotation,
                    vscode.TreeItemCollapsibleState.None,
                    this.isAnnotationSelected(annotation.id)
                )
            );
            return Promise.resolve(annotationItems);
        } else if (element instanceof GroupCategoryItem) {
            // Show annotations for this group
            const annotationItems = element.annotations.map(annotation =>
                new AnnotationItem(
                    annotation,
                    vscode.TreeItemCollapsibleState.None,
                    this.isAnnotationSelected(annotation.id)
                )
            );
            return Promise.resolve(annotationItems);
        }

        return Promise.resolve([]);
    }

    private getChildrenGroupedByFile(annotations: Annotation[]): Promise<TreeItem[]> {
        const fileGroups = new Map<string, Annotation[]>();

        annotations.forEach(annotation => {
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
    }

    private getChildrenGroupedByTag(annotations: Annotation[]): Promise<TreeItem[]> {
        const tagGroups = new Map<string, Annotation[]>();
        const untaggedAnnotations: Annotation[] = [];

        annotations.forEach(annotation => {
            if (!annotation.tags || annotation.tags.length === 0) {
                untaggedAnnotations.push(annotation);
            } else {
                annotation.tags.forEach(tag => {
                    if (!tagGroups.has(tag)) {
                        tagGroups.set(tag, []);
                    }
                    tagGroups.get(tag)!.push(annotation);
                });
            }
        });

        const tagItems: TreeItem[] = [];

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

        return Promise.resolve(tagItems);
    }

    private getChildrenGroupedByStatus(annotations: Annotation[]): Promise<TreeItem[]> {
        const openAnnotations = annotations.filter(a => !a.resolved);
        const resolvedAnnotations = annotations.filter(a => a.resolved);

        const statusItems: TreeItem[] = [];

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

        return Promise.resolve(statusItems);
    }
}

export class AnnotationItem extends vscode.TreeItem {
    constructor(
        public readonly annotation: Annotation,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false
    ) {
        const statusIcon = annotation.resolved ? '✓' : '○';
        const selectedIcon = isSelected ? '☑ ' : '☐ ';
        const preview = annotation.comment.length > 45
            ? annotation.comment.substring(0, 42) + '...'
            : annotation.comment;
        const tagsLabel = annotation.tags && annotation.tags.length > 0 ? ` [${annotation.tags.join(', ')}]` : '';

        super(`${selectedIcon}${statusIcon} Line ${annotation.range.start.line + 1}: ${preview}${tagsLabel}`, collapsibleState);

        const statusText = annotation.resolved ? 'Resolved' : 'Open';
        this.tooltip = `${annotation.comment}\n\nStatus: ${statusText}\nAuthor: ${annotation.author}\nDate: ${annotation.timestamp.toLocaleString()}`;
        this.description = annotation.author;
        this.contextValue = annotation.resolved ? 'resolvedAnnotation' : 'unresolvedAnnotation';
        this.iconPath = this.getIconPath();

        // Command to navigate to the annotation
        this.command = {
            command: 'annotative.goToAnnotation',
            title: 'Go to Annotation',
            arguments: [annotation]
        };
    }

    private getIconPath(): vscode.ThemeIcon {
        if (this.annotation.resolved) {
            return new vscode.ThemeIcon('check-all', new vscode.ThemeColor('testing.iconPassed'));
        }
        return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconQueued'));
    }
}

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