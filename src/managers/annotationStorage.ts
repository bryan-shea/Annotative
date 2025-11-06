import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Annotation, AnnotationStorage as IAnnotationStorage, AnnotationTag } from '../types';

/**
 * Handles persistence of annotations and custom tags
 * Manages file I/O for storage
 */
export class AnnotationStorageManager {
    private storageFilePath: string;
    private customTagsPath: string;

    constructor(
        private annotations: Map<string, Annotation[]>,
        context: vscode.ExtensionContext
    ) {
        this.storageFilePath = path.join(
            context.globalStorageUri?.fsPath || context.extensionUri.fsPath,
            'annotations.json'
        );
        this.customTagsPath = path.join(
            context.globalStorageUri?.fsPath || context.extensionUri.fsPath,
            'customTags.json'
        );
    }

    /**
     * Load annotations from storage
     */
    async loadAnnotations(): Promise<void> {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const data = fs.readFileSync(this.storageFilePath, 'utf-8');
                const storage: { workspaceAnnotations: { [key: string]: Annotation[] } } = JSON.parse(data);

                this.annotations.clear();
                Object.entries(storage.workspaceAnnotations).forEach(([filePath, annotations]) => {
                    const normalizedAnnotations = annotations.map(ann => ({
                        ...ann,
                        timestamp: new Date(ann.timestamp as any)
                    }));
                    this.annotations.set(filePath, normalizedAnnotations);
                });
            }
        } catch (error) {
            console.error('Failed to load annotations:', error);
        }
    }

    /**
     * Save annotations to storage
     */
    async saveAnnotations(): Promise<void> {
        try {
            // Ensure storage directory exists
            const storageDir = path.dirname(this.storageFilePath);
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            const storage: IAnnotationStorage = {
                workspaceAnnotations: Object.fromEntries(this.annotations)
            };

            fs.writeFileSync(this.storageFilePath, JSON.stringify(storage, null, 2));
        } catch (error) {
            console.error('Failed to save annotations:', error);
            vscode.window.showErrorMessage('Failed to save annotations');
        }
    }

    /**
     * Load custom tags from storage
     */
    async loadCustomTags(): Promise<AnnotationTag[]> {
        try {
            if (fs.existsSync(this.customTagsPath)) {
                const data = fs.readFileSync(this.customTagsPath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load custom tags:', error);
        }
        return [];
    }

    /**
     * Save custom tags to storage
     */
    async saveCustomTags(tags: AnnotationTag[]): Promise<void> {
        try {
            // Ensure storage directory exists
            const storageDir = path.dirname(this.customTagsPath);
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            fs.writeFileSync(this.customTagsPath, JSON.stringify(tags, null, 2));
        } catch (error) {
            console.error('Failed to save custom tags:', error);
            vscode.window.showErrorMessage('Failed to save custom tags');
        }
    }
}
