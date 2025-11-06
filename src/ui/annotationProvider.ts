import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationManager } from '../managers';
import {
    AnnotationItem,
    AnnotationFileItem,
    GroupCategoryItem,
    AnnotationFolderItem,
    type TreeItem
} from './treeItems';
import { filterAnnotations, type FilterStatus, type FilterTag } from './filtering';
import {
    groupByFile,
    groupByTag,
    groupByStatus,
    groupByFolder,
    groupByPriority
} from './grouping';

export type GroupBy = 'file' | 'tag' | 'status' | 'folder' | 'priority';

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
        const filtered = this.filterAnnotationsInternal(allAnnotations);
        filtered.forEach((ann: Annotation) => this.selectedAnnotationIds.add(ann.id));
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

    private filterAnnotationsInternal(annotations: Annotation[]): Annotation[] {
        return filterAnnotations(annotations, this.filterStatus, this.filterTag, this.searchQuery);
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // Root level - organize based on groupBy setting
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const filteredAnnotations = this.filterAnnotationsInternal(allAnnotations);

            if (this.groupBy === 'file') {
                return Promise.resolve(groupByFile(filteredAnnotations) as TreeItem[]);
            } else if (this.groupBy === 'tag') {
                return Promise.resolve(groupByTag(filteredAnnotations) as TreeItem[]);
            } else if (this.groupBy === 'folder') {
                return Promise.resolve(groupByFolder(filteredAnnotations) as TreeItem[]);
            } else if (this.groupBy === 'priority') {
                return Promise.resolve(groupByPriority(filteredAnnotations) as TreeItem[]);
            } else {
                return Promise.resolve(groupByStatus(filteredAnnotations) as TreeItem[]);
            }
        } else if (element instanceof AnnotationFileItem) {
            // Show annotations for the file
            const annotations = this.annotationManager.getAnnotationsForFile(element.filePath);
            const filteredAnnotations = this.filterAnnotationsInternal(annotations);
            const annotationItems = filteredAnnotations.map((annotation: Annotation) =>
                new AnnotationItem(
                    annotation,
                    vscode.TreeItemCollapsibleState.None,
                    this.isAnnotationSelected(annotation.id)
                )
            );
            return Promise.resolve(annotationItems as TreeItem[]);
        } else if (element instanceof AnnotationFolderItem) {
            // Show files in this folder
            const fileItems: TreeItem[] = [];
            const folderFiles = new Set<string>();

            element.files.forEach(filePath => {
                folderFiles.add(filePath);
            });

            const folderAnnotations = this.annotationManager.getAllAnnotations()
                .filter(ann => folderFiles.has(ann.filePath));
            const filteredAnnotations = this.filterAnnotationsInternal(folderAnnotations);

            // Group by file within folder
            const fileGroups = new Map<string, Annotation[]>();
            filteredAnnotations.forEach((annotation: Annotation) => {
                if (!fileGroups.has(annotation.filePath)) {
                    fileGroups.set(annotation.filePath, []);
                }
                fileGroups.get(annotation.filePath)!.push(annotation);
            });

            fileGroups.forEach((annotations, filePath) => {
                const unresolvedCount = annotations.filter(a => !a.resolved).length;
                const fileName = filePath.split(/[\\/]/).pop() || filePath;

                fileItems.push(new AnnotationFileItem(
                    fileName,
                    filePath,
                    annotations.length,
                    unresolvedCount,
                    vscode.TreeItemCollapsibleState.Expanded
                ));
            });

            return Promise.resolve(fileItems);
        } else if (element instanceof GroupCategoryItem) {
            // Show annotations for this group
            const annotationItems = element.annotations.map((annotation: Annotation) =>
                new AnnotationItem(
                    annotation,
                    vscode.TreeItemCollapsibleState.None,
                    this.isAnnotationSelected(annotation.id)
                )
            );
            return Promise.resolve(annotationItems as TreeItem[]);
        }

        return Promise.resolve([]);
    }
}

// Export types for use in extension.ts
export type { TreeItem };
export { AnnotationItem };
