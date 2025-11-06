import * as vscode from 'vscode';
import { Annotation, AnnotationTag, TagCategory, TagMetadata, AnnotationStatistics, TagSuggestion, ExportData } from '../types';
import { TagManager } from '../tags';
import { AnnotationCRUD } from './annotationCRUD';
import { AnnotationDecorations } from './annotationDecorations';
import { AnnotationStorageManager } from './annotationStorage';
import { AnnotationExporter } from './annotationExporter';

/**
 * Main annotation manager - orchestrates all annotation operations
 * Delegates to specialized modules for specific responsibilities
 */
export class AnnotationManager {
    private annotations: Map<string, Annotation[]> = new Map();
    private tagManager: TagManager;
    private crud: AnnotationCRUD;
    private decorations: AnnotationDecorations;
    private storage: AnnotationStorageManager;
    private exporter: AnnotationExporter;

    constructor(private context: vscode.ExtensionContext) {
        this.tagManager = new TagManager();
        this.decorations = new AnnotationDecorations();
        this.storage = new AnnotationStorageManager(this.annotations, context);
        this.crud = new AnnotationCRUD(this.annotations, this.decorations, this.storage);
        this.exporter = new AnnotationExporter(this.annotations);

        this.initialize();
    }

    /**
     * Initialize manager
     */
    private async initialize(): Promise<void> {
        await this.storage.loadAnnotations();
        this.loadCustomTags();
    }

    // ============== Tag Management ==============

    getTagManager(): TagManager {
        return this.tagManager;
    }

    getPresetTags(): AnnotationTag[] {
        return this.tagManager.getPresetTags();
    }

    getCustomTags(): AnnotationTag[] {
        return this.tagManager.getCustomTags();
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

    // ============== CRUD Operations ==============

    async addAnnotation(
        editor: vscode.TextEditor,
        range: vscode.Range,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<Annotation> {
        return this.crud.addAnnotation(editor, range, comment, tags, color);
    }

    async removeAnnotation(annotationId: string, filePath: string): Promise<void> {
        return this.crud.removeAnnotation(annotationId, filePath);
    }

    async toggleResolvedStatus(annotationId: string, filePath: string): Promise<void> {
        return this.crud.toggleResolvedStatus(annotationId, filePath);
    }

    async editAnnotation(
        annotationId: string,
        filePath: string,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<void> {
        return this.crud.editAnnotation(annotationId, filePath, comment, tags, color);
    }

    getAnnotation(annotationId: string, filePath: string): Annotation | undefined {
        return this.crud.getAnnotation(annotationId, filePath);
    }

    async undoLastAnnotation(): Promise<Annotation | undefined> {
        return this.crud.undoLastAnnotation();
    }

    async resolveAll(filePath?: string): Promise<number> {
        return this.crud.resolveAll(filePath);
    }

    async deleteResolved(filePath?: string): Promise<number> {
        return this.crud.deleteResolved(filePath);
    }

    async deleteAll(filePath?: string): Promise<number> {
        return this.crud.deleteAll(filePath);
    }

    // ============== Query Operations ==============

    getAllTags(): string[] {
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

    // ============== Decoration & Styling ==============

    updateDecorations(editor: vscode.TextEditor): void {
        const fileAnnotations = this.exporter.getAnnotationsForFile(editor.document.uri.fsPath);
        this.decorations.updateDecorations(editor, fileAnnotations);
    }

    // ============== Export & Import ==============

    async exportAnnotations(): Promise<ExportData> {
        return this.exporter.exportAnnotations();
    }

    async exportToMarkdown(): Promise<string> {
        return this.exporter.exportToMarkdown();
    }

    // ============== Persistence ==============

    private async loadCustomTags(): Promise<void> {
        try {
            const customTags = await this.storage.loadCustomTags();
            if (customTags && customTags.length > 0) {
                this.tagManager.importCustomTags(customTags);
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

    /**
     * Dispose resources
     */
    dispose(): void {
        this.decorations.dispose();
    }
}
