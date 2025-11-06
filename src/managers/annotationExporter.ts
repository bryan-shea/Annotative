import * as vscode from 'vscode';
import { Annotation, ExportData } from '../types';

/**
 * Export and utility functions for annotations
 */
export class AnnotationExporter {
    constructor(private annotations: Map<string, Annotation[]>) {}

    /**
     * Export all annotations
     */
    async exportAnnotations(): Promise<ExportData> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceName = workspaceFolders ? workspaceFolders[0].name : 'Unknown Workspace';

        return {
            annotations: this.getAllAnnotations(),
            exportedAt: new Date(),
            workspaceName
        };
    }

    /**
     * Export annotations to Markdown
     */
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

                if (annotation.tags && annotation.tags.length > 0) {
                    markdown += `**Tags:** ${annotation.tags.join(', ')}\n\n`;
                }

                markdown += '---\n\n';
            });
        });

        return markdown;
    }

    /**
     * Get all annotations across all files
     */
    getAllAnnotations(): Annotation[] {
        const allAnnotations: Annotation[] = [];
        this.annotations.forEach(annotations => {
            allAnnotations.push(...annotations);
        });
        return allAnnotations;
    }

    /**
     * Get annotations for a specific file
     */
    getAnnotationsForFile(filePath: string): Annotation[] {
        return this.annotations.get(filePath) || [];
    }

    /**
     * Get all tags across all annotations
     */
    getAllTags(): string[] {
        const tagSet = new Set<string>();
        this.annotations.forEach(fileAnnotations => {
            fileAnnotations.forEach(annotation => {
                if (annotation.tags) {
                    annotation.tags.forEach(tag => {
                        const tagId = typeof tag === 'string' ? tag : tag.id;
                        tagSet.add(tagId);
                    });
                }
            });
        });
        return Array.from(tagSet).sort();
    }

    /**
     * Get statistics about annotations
     */
    getStatistics(): {
        total: number;
        resolved: number;
        unresolved: number;
        byFile: Map<string, { total: number; resolved: number; unresolved: number }>;
    } {
        let total = 0;
        let resolved = 0;
        let unresolved = 0;
        const byFile = new Map<string, { total: number; resolved: number; unresolved: number }>();

        this.annotations.forEach((fileAnnotations, filePath) => {
            const fileStats = {
                total: fileAnnotations.length,
                resolved: fileAnnotations.filter(a => a.resolved).length,
                unresolved: fileAnnotations.filter(a => !a.resolved).length
            };

            byFile.set(filePath, fileStats);
            total += fileStats.total;
            resolved += fileStats.resolved;
            unresolved += fileStats.unresolved;
        });

        return { total, resolved, unresolved, byFile };
    }
}
