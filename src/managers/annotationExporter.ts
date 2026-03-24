import * as vscode from 'vscode';
import { Annotation, ExportData } from '../types';
import { getRelativePathForFile, getWorkspaceNameForAnnotations, groupAnnotationsByFile } from './exportSupport';

/**
 * Export and utility functions for annotations
 */
export class AnnotationExporter {
    constructor(
        private annotations: Map<string, Annotation[]>,
        private resolveTagLabels: (tagIds?: readonly string[]) => string[] = (tagIds) => [...(tagIds || [])]
    ) {}

    /**
     * Export all annotations
     */
    async exportAnnotations(): Promise<ExportData> {
        const annotations = this.getAllAnnotations();

        return {
            annotations,
            exportedAt: new Date(),
            workspaceName: getWorkspaceNameForAnnotations(annotations)
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
        const annotationsByFile = groupAnnotationsByFile(exportData.annotations);

        annotationsByFile.forEach((annotations, filePath) => {
            const relativePath = getRelativePathForFile(filePath);
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
                    markdown += `**Tags:** ${this.resolveTagLabels(annotation.tags).join(', ')}\n\n`;
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
                    annotation.tags.forEach(tagId => {
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
