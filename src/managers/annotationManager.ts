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
    private onDidChangeAnnotationsEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeAnnotations = this.onDidChangeAnnotationsEmitter.event;

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
     * Notify listeners that annotations have changed
     */
    private notifyAnnotationsChanged(): void {
        this.onDidChangeAnnotationsEmitter.fire();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.decorations.dispose();
        this.onDidChangeAnnotationsEmitter.dispose();
    }
}
