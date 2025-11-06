import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationDecorations } from './annotationDecorations';
import { AnnotationStorageManager } from './annotationStorage';

/**
 * Handles CRUD operations for annotations
 * Create, Read, Update, Delete
 */
export class AnnotationCRUD {
    private annotationHistory: Annotation[] = [];

    constructor(
        private annotations: Map<string, Annotation[]>,
        private decorations: AnnotationDecorations,
        private storage: AnnotationStorageManager
    ) {}

    /**
     * Add a new annotation
     */
    async addAnnotation(
        editor: vscode.TextEditor,
        range: vscode.Range,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<Annotation> {
        const filePath = editor.document.uri.fsPath;
        const selectedText = editor.document.getText(range);

        const annotation: Annotation = {
            id: this.generateId(),
            filePath,
            range,
            text: selectedText,
            comment,
            author: await this.getAuthor(),
            timestamp: new Date(),
            resolved: false,
            tags: tags || [],
            color: color || '#ffc107'
        };

        if (!this.annotations.has(filePath)) {
            this.annotations.set(filePath, []);
        }

        this.annotations.get(filePath)!.push(annotation);
        this.annotationHistory.push(annotation);
        await this.storage.saveAnnotations();
        this.decorations.updateDecorations(editor, this.annotations.get(filePath)!);

        return annotation;
    }

    /**
     * Remove an annotation
     */
    async removeAnnotation(annotationId: string, filePath: string): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const index = fileAnnotations.findIndex(a => a.id === annotationId);
            if (index !== -1) {
                fileAnnotations.splice(index, 1);
                await this.storage.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.decorations.updateDecorations(activeEditor, fileAnnotations);
                }
            }
        }
    }

    /**
     * Toggle resolved status
     */
    async toggleResolvedStatus(annotationId: string, filePath: string): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const annotation = fileAnnotations.find(a => a.id === annotationId);
            if (annotation) {
                annotation.resolved = !annotation.resolved;
                await this.storage.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.decorations.updateDecorations(activeEditor, fileAnnotations);
                }
            }
        }
    }

    /**
     * Edit an annotation
     */
    async editAnnotation(
        annotationId: string,
        filePath: string,
        comment: string,
        tags?: string[],
        color?: string
    ): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const annotation = fileAnnotations.find(a => a.id === annotationId);
            if (annotation) {
                annotation.comment = comment;
                annotation.tags = tags || [];
                if (color) {
                    annotation.color = color;
                }
                await this.storage.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.decorations.updateDecorations(activeEditor, fileAnnotations);
                }
            }
        }
    }

    /**
     * Get annotation by ID
     */
    getAnnotation(annotationId: string, filePath: string): Annotation | undefined {
        const fileAnnotations = this.annotations.get(filePath);
        return fileAnnotations?.find(a => a.id === annotationId);
    }

    /**
     * Undo last annotation
     */
    async undoLastAnnotation(): Promise<Annotation | undefined> {
        if (this.annotationHistory.length === 0) {
            return undefined;
        }

        const lastAnnotation = this.annotationHistory.pop();
        if (lastAnnotation) {
            const fileAnnotations = this.annotations.get(lastAnnotation.filePath);
            if (fileAnnotations) {
                const index = fileAnnotations.findIndex(a => a.id === lastAnnotation.id);
                if (index !== -1) {
                    fileAnnotations.splice(index, 1);
                    await this.storage.saveAnnotations();
                }
            }
        }

        return lastAnnotation;
    }

    /**
     * Resolve all annotations in a file or globally
     */
    async resolveAll(filePath?: string): Promise<number> {
        let resolvedCount = 0;

        if (filePath) {
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                fileAnnotations.forEach(ann => {
                    if (!ann.resolved) {
                        ann.resolved = true;
                        resolvedCount++;
                    }
                });
            }
        } else {
            this.annotations.forEach(fileAnnotations => {
                fileAnnotations.forEach(ann => {
                    if (!ann.resolved) {
                        ann.resolved = true;
                        resolvedCount++;
                    }
                });
            });
        }

        if (resolvedCount > 0) {
            await this.storage.saveAnnotations();

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileAnnotations = this.annotations.get(activeEditor.document.uri.fsPath) || [];
                this.decorations.updateDecorations(activeEditor, fileAnnotations);
            }
        }

        return resolvedCount;
    }

    /**
     * Delete resolved annotations
     */
    async deleteResolved(filePath?: string): Promise<number> {
        let deletedCount = 0;

        if (filePath) {
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                const before = fileAnnotations.length;
                this.annotations.set(
                    filePath,
                    fileAnnotations.filter(ann => !ann.resolved)
                );
                deletedCount = before - (fileAnnotations.length);
            }
        } else {
            this.annotations.forEach((fileAnnotations, path) => {
                const before = fileAnnotations.length;
                this.annotations.set(
                    path,
                    fileAnnotations.filter(ann => !ann.resolved)
                );
                deletedCount += before - (fileAnnotations.length);
            });
        }

        if (deletedCount > 0) {
            await this.storage.saveAnnotations();

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileAnnotations = this.annotations.get(activeEditor.document.uri.fsPath) || [];
                this.decorations.updateDecorations(activeEditor, fileAnnotations);
            }
        }

        return deletedCount;
    }

    /**
     * Delete all annotations
     */
    async deleteAll(filePath?: string): Promise<number> {
        let deletedCount = 0;

        if (filePath) {
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                deletedCount = fileAnnotations.length;
                this.annotations.delete(filePath);
            }
        } else {
            this.annotations.forEach(fileAnnotations => {
                deletedCount += fileAnnotations.length;
            });
            this.annotations.clear();
        }

        if (deletedCount > 0) {
            await this.storage.saveAnnotations();

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileAnnotations = this.annotations.get(activeEditor.document.uri.fsPath) || [];
                this.decorations.updateDecorations(activeEditor, fileAnnotations);
            }
        }

        return deletedCount;
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get author name
     */
    private async getAuthor(): Promise<string> {
        try {
            const gitConfig = vscode.workspace.getConfiguration('git');
            const userName = gitConfig.get<string>('user.name');
            if (userName) {
                return userName;
            }
        } catch (error) {
            // Ignore
        }

        return process.env.USERNAME || process.env.USER || 'Unknown User';
    }
}
