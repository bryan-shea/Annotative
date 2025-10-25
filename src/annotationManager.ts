import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Annotation, AnnotationStorage, ExportData } from './types';

export class AnnotationManager {
    private annotations: Map<string, Annotation[]> = new Map();
    private storageFilePath: string;
    private decorationType: vscode.TextEditorDecorationType;
    private annotationHistory: Annotation[] = []; // For undo functionality

    constructor(private context: vscode.ExtensionContext) {
        this.storageFilePath = path.join(
            context.globalStorageUri?.fsPath || context.extensionUri.fsPath,
            'annotations.json'
        );

        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            border: '1px solid rgba(255, 193, 7, 0.5)',
            borderRadius: '2px',
            isWholeLine: false,
            after: {
                contentText: '',
                color: '#ffc107',
                fontWeight: 'bold'
            }
        });

        this.loadAnnotations();
    }

    async addAnnotation(
        editor: vscode.TextEditor,
        range: vscode.Range,
        comment: string,
        tags?: string[]
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
            tags: tags || []
        };

        if (!this.annotations.has(filePath)) {
            this.annotations.set(filePath, []);
        }

        this.annotations.get(filePath)!.push(annotation);
        this.annotationHistory.push(annotation); // Track for undo
        await this.saveAnnotations();
        this.updateDecorations(editor);

        return annotation;
    }

    async removeAnnotation(annotationId: string, filePath: string): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const index = fileAnnotations.findIndex(a => a.id === annotationId);
            if (index !== -1) {
                fileAnnotations.splice(index, 1);
                await this.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.updateDecorations(activeEditor);
                }
            }
        }
    }

    async toggleResolvedStatus(annotationId: string, filePath: string): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const annotation = fileAnnotations.find(a => a.id === annotationId);
            if (annotation) {
                annotation.resolved = !annotation.resolved;
                await this.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.updateDecorations(activeEditor);
                }
            }
        }
    }

    async editAnnotation(annotationId: string, filePath: string, comment: string, tags?: string[]): Promise<void> {
        const fileAnnotations = this.annotations.get(filePath);
        if (fileAnnotations) {
            const annotation = fileAnnotations.find(a => a.id === annotationId);
            if (annotation) {
                annotation.comment = comment;
                annotation.tags = tags || [];
                await this.saveAnnotations();

                // Update decorations for the active editor if it matches
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                    this.updateDecorations(activeEditor);
                }
            }
        }
    }

    getAnnotation(annotationId: string, filePath: string): Annotation | undefined {
        const fileAnnotations = this.annotations.get(filePath);
        return fileAnnotations?.find(a => a.id === annotationId);
    }

    undoLastAnnotation(): Annotation | undefined {
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
                    this.saveAnnotations();

                    // Update decorations for the active editor if it matches
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.uri.fsPath === lastAnnotation.filePath) {
                        this.updateDecorations(activeEditor);
                    }
                }
            }
        }

        return lastAnnotation;
    }

    async resolveAll(filePath?: string): Promise<number> {
        let resolvedCount = 0;

        if (filePath) {
            // Resolve all annotations in a specific file
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                fileAnnotations.forEach(annotation => {
                    if (!annotation.resolved) {
                        annotation.resolved = true;
                        resolvedCount++;
                    }
                });
            }
        } else {
            // Resolve all annotations in all files
            this.annotations.forEach(fileAnnotations => {
                fileAnnotations.forEach(annotation => {
                    if (!annotation.resolved) {
                        annotation.resolved = true;
                        resolvedCount++;
                    }
                });
            });
        }

        if (resolvedCount > 0) {
            await this.saveAnnotations();

            // Update decorations for the active editor
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                this.updateDecorations(activeEditor);
            }
        }

        return resolvedCount;
    }

    async deleteResolved(filePath?: string): Promise<number> {
        let deletedCount = 0;

        if (filePath) {
            // Delete resolved annotations in a specific file
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                const unresolvedAnnotations = fileAnnotations.filter(a => !a.resolved);
                deletedCount = fileAnnotations.length - unresolvedAnnotations.length;
                this.annotations.set(filePath, unresolvedAnnotations);
            }
        } else {
            // Delete resolved annotations in all files
            this.annotations.forEach((fileAnnotations, path) => {
                const unresolvedAnnotations = fileAnnotations.filter(a => !a.resolved);
                deletedCount += fileAnnotations.length - unresolvedAnnotations.length;
                this.annotations.set(path, unresolvedAnnotations);
            });
        }

        if (deletedCount > 0) {
            await this.saveAnnotations();

            // Update decorations for the active editor
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                this.updateDecorations(activeEditor);
            }
        }

        return deletedCount;
    }

    async deleteAll(filePath?: string): Promise<number> {
        let deletedCount = 0;

        if (filePath) {
            // Delete all annotations in a specific file
            const fileAnnotations = this.annotations.get(filePath);
            if (fileAnnotations) {
                deletedCount = fileAnnotations.length;
                this.annotations.delete(filePath);
            }
        } else {
            // Delete all annotations in all files
            this.annotations.forEach(fileAnnotations => {
                deletedCount += fileAnnotations.length;
            });
            this.annotations.clear();
        }

        if (deletedCount > 0) {
            await this.saveAnnotations();

            // Update decorations for the active editor
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                this.updateDecorations(activeEditor);
            }
        }

        return deletedCount;
    }

    getAllTags(): string[] {
        const tagSet = new Set<string>();
        this.annotations.forEach(fileAnnotations => {
            fileAnnotations.forEach(annotation => {
                annotation.tags?.forEach(tag => tagSet.add(tag));
            });
        });
        return Array.from(tagSet).sort();
    }

    getAnnotationsForFile(filePath: string): Annotation[] {
        return this.annotations.get(filePath) || [];
    }

    getAllAnnotations(): Annotation[] {
        const allAnnotations: Annotation[] = [];
        this.annotations.forEach(annotations => {
            allAnnotations.push(...annotations);
        });
        return allAnnotations;
    }

    updateDecorations(editor: vscode.TextEditor): void {
        const filePath = editor.document.uri.fsPath;
        const fileAnnotations = this.getAnnotationsForFile(filePath);

        const decorationOptions: vscode.DecorationOptions[] = fileAnnotations
            .filter(annotation => !annotation.resolved)
            .map(annotation => ({
                range: annotation.range,
                hoverMessage: new vscode.MarkdownString(
                    `**Annotation by ${annotation.author}**\n\n${annotation.comment}\n\n*${annotation.timestamp.toLocaleString()}*`
                )
            }));

        editor.setDecorations(this.decorationType, decorationOptions);
    }

    async exportAnnotations(): Promise<ExportData> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceName = workspaceFolders ? workspaceFolders[0].name : 'Unknown Workspace';

        return {
            annotations: this.getAllAnnotations(),
            exportedAt: new Date(),
            workspaceName
        };
    }

    async exportToMarkdown(): Promise<string> {
        const exportData = await this.exportAnnotations();
        let markdown = `# Code Annotations - ${exportData.workspaceName}\n\n`;
        markdown += `*Exported on ${exportData.exportedAt.toLocaleString()}*\n\n`;

        if (exportData.annotations.length === 0) {
            markdown += '**No annotations found.**\n';
            return markdown;
        }

        // Group annotations by file
        const annotationsByFile = new Map<string, Annotation[]>();
        exportData.annotations.forEach(annotation => {
            if (!annotationsByFile.has(annotation.filePath)) {
                annotationsByFile.set(annotation.filePath, []);
            }
            annotationsByFile.get(annotation.filePath)!.push(annotation);
        });

        annotationsByFile.forEach((annotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            markdown += `## ${relativePath}\n\n`;

            annotations.forEach((annotation, index) => {
                const statusIcon = annotation.resolved ? '[Resolved]' : '[Open]';
                markdown += `### ${statusIcon} Annotation ${index + 1}\n\n`;
                markdown += `**Author:** ${annotation.author}  \n`;
                markdown += `**Date:** ${annotation.timestamp.toLocaleString()}  \n`;
                markdown += `**Lines:** ${annotation.range.start.line + 1}-${annotation.range.end.line + 1}  \n`;
                markdown += `**Status:** ${annotation.resolved ? 'Resolved' : 'Open'}\n\n`;

                markdown += `**Code:**\n\`\`\`\n${annotation.text}\n\`\`\`\n\n`;
                markdown += `**Comment:**\n${annotation.comment}\n\n`;
                markdown += '---\n\n';
            });
        });

        return markdown;
    }

    private async loadAnnotations(): Promise<void> {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const data = fs.readFileSync(this.storageFilePath, 'utf8');
                const storage: AnnotationStorage = JSON.parse(data);

                // Convert stored data back to Map and restore Date objects
                Object.entries(storage.workspaceAnnotations).forEach(([filePath, annotations]) => {
                    const restoredAnnotations = annotations.map(a => ({
                        ...a,
                        timestamp: new Date(a.timestamp),
                        range: new vscode.Range(
                            a.range.start.line,
                            a.range.start.character,
                            a.range.end.line,
                            a.range.end.character
                        )
                    }));
                    this.annotations.set(filePath, restoredAnnotations);
                });
            }
        } catch (error) {
            console.error('Failed to load annotations:', error);
        }
    }

    private async saveAnnotations(): Promise<void> {
        try {
            // Ensure storage directory exists
            const storageDir = path.dirname(this.storageFilePath);
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            const storage: AnnotationStorage = {
                workspaceAnnotations: Object.fromEntries(this.annotations)
            };

            fs.writeFileSync(this.storageFilePath, JSON.stringify(storage, null, 2));
        } catch (error) {
            console.error('Failed to save annotations:', error);
            vscode.window.showErrorMessage('Failed to save annotations');
        }
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private async getAuthor(): Promise<string> {
        // Try to get Git user name
        try {
            const gitConfig = await vscode.workspace.getConfiguration('git');
            const userName = gitConfig.get<string>('user.name');
            if (userName) {
                return userName;
            }
        } catch (error) {
            // Git config not available
        }

        // Fallback to system username or default
        return process.env.USERNAME || process.env.USER || 'Unknown User';
    }

    dispose(): void {
        this.decorationType.dispose();
    }
}