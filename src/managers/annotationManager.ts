import * as vscode from 'vscode';
import {
    Annotation,
    AnnotationStatistics,
    AnnotationTag,
    AnnotationTagOption,
    ExportData,
    TagCategory,
    TagMetadata,
    TagPriority,
    TagSuggestion,
} from '../types';
import { TagManager } from '../tags';
import { AnnotationCRUD } from './annotationCRUD';
import { AnnotationDecorations } from './annotationDecorations';
import { AnnotationStorageManager } from './annotationStorage';
import { AnnotationExporter } from './annotationExporter';

/**
 * Main annotation manager - orchestrates all annotation operations.
 */
export class AnnotationManager {
    private annotations: Map<string, Annotation[]> = new Map();
    private tagManager: TagManager;
    private crud: AnnotationCRUD;
    private decorations: AnnotationDecorations;
    private storage: AnnotationStorageManager;
    private exporter: AnnotationExporter;
    private onDidChangeAnnotationsEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeAnnotations = this.onDidChangeAnnotationsEmitter.event;
    public readonly ready: Promise<void>;

    constructor(private context: vscode.ExtensionContext) {
        this.tagManager = new TagManager();
        this.decorations = new AnnotationDecorations();
        this.storage = new AnnotationStorageManager(this.annotations, context);
        this.crud = new AnnotationCRUD(this.annotations, this.decorations, this.storage);
        this.exporter = new AnnotationExporter(this.annotations, (tagIds) => this.resolveTagLabels(tagIds));

        this.ready = this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.loadCustomTags();
        const annotationLoad = await this.storage.loadAnnotations();
        const migratedAnnotations = this.normalizeLoadedAnnotations();

        if (annotationLoad.needsSave || migratedAnnotations) {
            await this.storage.saveAnnotations();
        }
    }

    getTagManager(): TagManager {
        return this.tagManager;
    }

    getPresetTags(): AnnotationTag[] {
        return this.tagManager.getPresetTags();
    }

    getCustomTags(): AnnotationTag[] {
        return this.tagManager.getCustomTags();
    }

    getTagOptions(): AnnotationTagOption[] {
        return this.tagManager
            .getAllTags()
            .map(tag => ({
                id: tag.id,
                label: tag.name,
                color: tag.metadata?.color,
                priority: tag.metadata?.priority,
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }

    resolveTagLabel(tagId: string): string {
        return this.tagManager.getTag(tagId)?.name || tagId;
    }

    resolveTagLabels(tagIds?: readonly string[]): string[] {
        if (!tagIds || tagIds.length === 0) {
            return [];
        }

        return tagIds.map(tagId => this.resolveTagLabel(tagId));
    }

    getAnnotationPriority(annotation: Annotation): TagPriority | undefined {
        const priorityOrder: TagPriority[] = ['critical', 'high', 'medium', 'low'];
        const priorities = (annotation.tags || [])
            .map(tagId => this.tagManager.getTagPriority(tagId))
            .filter((priority): priority is TagPriority =>
                priority === 'critical' || priority === 'high' || priority === 'medium' || priority === 'low'
            );

        return priorityOrder.find(priority => priorities.includes(priority));
    }

    async createCustomTag(name: string, category: TagCategory, metadata?: TagMetadata): Promise<AnnotationTag> {
        const tag = this.tagManager.createCustomTag(name, category, metadata);
        await this.saveCustomTags();
        return tag;
    }

    async updateCustomTag(id: string, name?: string, metadata?: TagMetadata): Promise<AnnotationTag | undefined> {
        const tag = this.tagManager.updateCustomTag(id, name, metadata);
        if (tag) {
            await this.saveCustomTags();
        }
        return tag;
    }

    async deleteCustomTag(id: string): Promise<boolean> {
        const deleted = this.tagManager.deleteCustomTag(id);
        if (deleted) {
            await this.saveCustomTags();
        }
        return deleted;
    }

    getTagSuggestions(comment: string): TagSuggestion[] {
        return this.tagManager.suggestTagsFromComment(comment);
    }

    async addAnnotation(
        editor: vscode.TextEditor,
        range: vscode.Range,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<Annotation> {
        const result = await this.crud.addAnnotation(editor, range, comment, tags, color);
        this.notifyAnnotationsChanged();
        return result;
    }

    async removeAnnotation(annotationId: string, filePath: string): Promise<void> {
        await this.crud.removeAnnotation(annotationId, filePath);
        this.notifyAnnotationsChanged();
    }

    async toggleResolvedStatus(annotationId: string, filePath: string): Promise<void> {
        await this.crud.toggleResolvedStatus(annotationId, filePath);
        this.notifyAnnotationsChanged();
    }

    async editAnnotation(
        annotationId: string,
        filePath: string,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<void> {
        await this.crud.editAnnotation(annotationId, filePath, comment, tags, color);
        this.notifyAnnotationsChanged();
    }

    getAnnotation(annotationId: string, filePath: string): Annotation | undefined {
        return this.crud.getAnnotation(annotationId, filePath);
    }

    async undoLastAnnotation(): Promise<Annotation | undefined> {
        const result = await this.crud.undoLastAnnotation();
        this.notifyAnnotationsChanged();
        return result;
    }

    async resolveAll(filePath?: string): Promise<number> {
        const result = await this.crud.resolveAll(filePath);
        if (result > 0) {
            this.notifyAnnotationsChanged();
        }
        return result;
    }

    async deleteResolved(filePath?: string): Promise<number> {
        const result = await this.crud.deleteResolved(filePath);
        if (result > 0) {
            this.notifyAnnotationsChanged();
        }
        return result;
    }

    async deleteAll(filePath?: string): Promise<number> {
        const result = await this.crud.deleteAll(filePath);
        if (result > 0) {
            this.notifyAnnotationsChanged();
        }
        return result;
    }

    getAllTags(): string[] {
        const usedTags = this.exporter.getAllTags();
        const presetTagIds = this.tagManager.getPresetTags().map(tag => tag.id);
        const customTagIds = this.tagManager.getCustomTags().map(tag => tag.id);
        const allTags = new Set([...usedTags, ...presetTagIds, ...customTagIds]);
        return Array.from(allTags).sort();
    }

    getUsedTags(): string[] {
        return this.exporter.getAllTags();
    }

    getAnnotationsForFile(filePath: string): Annotation[] {
        return this.exporter.getAnnotationsForFile(filePath);
    }

    getAllAnnotations(): Annotation[] {
        return this.exporter.getAllAnnotations();
    }

    getStatistics(): AnnotationStatistics {
        return this.exporter.getStatistics();
    }

    updateDecorations(editor: vscode.TextEditor): void {
        const fileAnnotations = this.exporter.getAnnotationsForFile(editor.document.uri.fsPath);
        this.decorations.updateDecorations(editor, fileAnnotations);
    }

    async exportAnnotations(): Promise<ExportData> {
        return this.exporter.exportAnnotations();
    }

    async exportToMarkdown(): Promise<string> {
        return this.exporter.exportToMarkdown();
    }

    isProjectStorageActive(): boolean {
        return this.storage.isProjectStorageActive();
    }

    getStorageDirectory(): string {
        return this.storage.getStorageDirectory();
    }

    async initializeProjectStorage(): Promise<boolean> {
        const result = await this.storage.initializeProjectStorage();
        await this.loadCustomTags();
        const annotationLoad = await this.storage.loadAnnotations();
        const migratedAnnotations = this.normalizeLoadedAnnotations();
        if (annotationLoad.needsSave || migratedAnnotations) {
            await this.storage.saveAnnotations();
        }

        this.notifyAnnotationsChanged();
        return result;
    }

    refreshStorageDetection(): void {
        this.storage.refreshStorageDetection();
    }

    private async loadCustomTags(): Promise<void> {
        try {
            const loaded = await this.storage.loadCustomTags();
            if (loaded.tags.length > 0) {
                this.tagManager.importCustomTags(loaded.tags);
            }

            if (loaded.needsSave) {
                await this.saveCustomTags();
            }
        } catch (error) {
            console.error('Failed to load custom tags:', error);
        }
    }

    private async saveCustomTags(): Promise<void> {
        try {
            const customTags = this.tagManager.exportCustomTags();
            await this.storage.saveCustomTags(customTags);
        } catch (error) {
            console.error('Failed to save custom tags:', error);
        }
    }

    private normalizeLoadedAnnotations(): boolean {
        const allTags = this.tagManager.getAllTags();
        const tagsById = new Map(allTags.map(tag => [tag.id.toLowerCase(), tag.id]));
        const tagsByName = new Map(allTags.map(tag => [tag.name.toLowerCase(), tag.id]));
        let changed = false;

        this.annotations.forEach(fileAnnotations => {
            fileAnnotations.forEach(annotation => {
                const nextTags: string[] = [];

                (annotation.tags || []).forEach(rawTagId => {
                    const normalizedInput = rawTagId.trim();
                    if (!normalizedInput) {
                        changed = true;
                        return;
                    }

                    const lookupKey = normalizedInput.toLowerCase();
                    const resolvedId = tagsById.get(lookupKey) || tagsByName.get(lookupKey) || normalizedInput;
                    if (resolvedId !== rawTagId) {
                        changed = true;
                    }

                    if (!nextTags.includes(resolvedId)) {
                        nextTags.push(resolvedId);
                    } else {
                        changed = true;
                    }
                });

                if ((annotation.tags || []).length !== nextTags.length) {
                    changed = true;
                }

                annotation.tags = nextTags;
            });
        });

        return changed;
    }

    private notifyAnnotationsChanged(): void {
        this.onDidChangeAnnotationsEmitter.fire();
    }

    dispose(): void {
        void this.context;
        this.decorations.dispose();
        this.onDidChangeAnnotationsEmitter.dispose();
    }
}
