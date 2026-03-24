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
import { reattachAnnotation } from './annotationAnchors';
import { AnnotationCRUD } from './annotationCRUD';
import { AnnotationDecorations } from './annotationDecorations';
import { AnnotationExportService } from './annotationExportService';
import { AnnotationStorageManager } from './annotationStorage';

/**
 * Main annotation manager - orchestrates all annotation operations.
 */
export class AnnotationManager {
    private annotations: Map<string, Annotation[]> = new Map();
    private tagManager: TagManager;
    private crud: AnnotationCRUD;
    private decorations: AnnotationDecorations;
    private storage: AnnotationStorageManager;
    private exportService: AnnotationExportService;
    private onDidChangeAnnotationsEmitter = new vscode.EventEmitter<void>();
    private persistenceScheduled = false;
    public readonly onDidChangeAnnotations = this.onDidChangeAnnotationsEmitter.event;
    public readonly ready: Promise<void>;

    constructor(private context: vscode.ExtensionContext) {
        this.tagManager = new TagManager();
        this.decorations = new AnnotationDecorations();
        this.storage = new AnnotationStorageManager(this.annotations, context);
        this.crud = new AnnotationCRUD(this.annotations, this.decorations, this.storage);
        this.exportService = new AnnotationExportService(this.annotations, (tagIds) => this.resolveTagLabels(tagIds));

        this.ready = this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.loadCustomTags();
        const annotationLoad = await this.storage.loadAnnotations();
        const migratedAnnotations = this.normalizeLoadedAnnotations();
        const rebasedAnnotations = await this.rebaseStoredAnnotations();

        if (annotationLoad.needsSave || migratedAnnotations || rebasedAnnotations) {
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
        const usedTags = this.exportService.getAllTags();
        const presetTagIds = this.tagManager.getPresetTags().map(tag => tag.id);
        const customTagIds = this.tagManager.getCustomTags().map(tag => tag.id);
        const allTags = new Set([...usedTags, ...presetTagIds, ...customTagIds]);
        return Array.from(allTags).sort();
    }

    getUsedTags(): string[] {
        return this.exportService.getAllTags();
    }

    getAnnotationsForFile(filePath: string): Annotation[] {
        const openDocument = this.findOpenDocument(filePath);
        if (openDocument && this.rebaseAnnotationsForText(filePath, openDocument.getText())) {
            this.scheduleAnnotationPersistence();
        }

        return this.exportService.getAnnotationsForFile(filePath);
    }

    getAllAnnotations(): Annotation[] {
        this.refreshOpenDocuments();
        return this.exportService.getAllAnnotations();
    }

    getStatistics(): AnnotationStatistics {
        this.refreshOpenDocuments();
        return this.exportService.getStatistics();
    }

    updateDecorations(editor: vscode.TextEditor): void {
        if (this.rebaseAnnotationsForText(editor.document.uri.fsPath, editor.document.getText())) {
            this.scheduleAnnotationPersistence();
        }

        const fileAnnotations = this.exportService.getAnnotationsForFile(editor.document.uri.fsPath);
        this.decorations.updateDecorations(editor, fileAnnotations);
    }

    async rebaseAnnotationsForDocument(document: vscode.TextDocument): Promise<boolean> {
        if (document.uri.scheme !== 'file') {
            return false;
        }

        const changed = this.rebaseAnnotationsForText(document.uri.fsPath, document.getText());
        if (changed) {
            await this.storage.saveAnnotations();
            this.notifyAnnotationsChanged();
        }

        return changed;
    }

    async exportAnnotations(): Promise<ExportData> {
        return this.exportService.exportAnnotations();
    }

    async exportToMarkdown(): Promise<string> {
        return this.exportService.exportToMarkdown();
    }

    getExportService(): AnnotationExportService {
        return this.exportService;
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

                if (annotation.anchor && annotation.anchor.selectedText !== annotation.text) {
                    changed = true;
                }
            });
        });

        return changed;
    }

    private async rebaseStoredAnnotations(): Promise<boolean> {
        const filePaths = Array.from(this.annotations.keys());
        let changed = false;

        for (const filePath of filePaths) {
            try {
                const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
                const documentText = Buffer.from(fileContents).toString('utf-8');
                changed = this.rebaseAnnotationsForText(filePath, documentText) || changed;
            } catch {
                continue;
            }
        }

        return changed;
    }

    private rebaseAnnotationsForText(filePath: string, documentText: string): boolean {
        const fileAnnotations = this.annotations.get(filePath);
        if (!fileAnnotations || fileAnnotations.length === 0) {
            return false;
        }

        let changed = false;
        fileAnnotations.forEach(annotation => {
            const reattached = reattachAnnotation(annotation, documentText);
            if (!reattached.changed) {
                return;
            }

            annotation.range = reattached.range;
            annotation.text = reattached.text;
            annotation.anchor = reattached.anchor;
            changed = true;
        });

        return changed;
    }

    private refreshOpenDocuments(): void {
        let changed = false;

        vscode.workspace.textDocuments.forEach(document => {
            if (document.uri.scheme !== 'file') {
                return;
            }

            changed = this.rebaseAnnotationsForText(document.uri.fsPath, document.getText()) || changed;
        });

        if (changed) {
            this.scheduleAnnotationPersistence();
        }
    }

    private findOpenDocument(filePath: string): vscode.TextDocument | undefined {
        return vscode.workspace.textDocuments.find(document => document.uri.scheme === 'file' && document.uri.fsPath === filePath);
    }

    private scheduleAnnotationPersistence(): void {
        if (this.persistenceScheduled) {
            return;
        }

        this.persistenceScheduled = true;
        void Promise.resolve().then(async () => {
            this.persistenceScheduled = false;
            await this.storage.saveAnnotations();
            this.notifyAnnotationsChanged();
        });
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
