import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Annotation } from './types';

export enum CopilotExportFormat {
    Chat = 'chat',           // Optimized for pasting into Copilot Chat
    Context = 'context',     // XML-style context format
    Workspace = 'workspace'  // Save to .copilot folder
}

export class CopilotExporter {

    /**
     * Export annotations in Copilot Chat optimized format
     */
    public static exportForCopilotChat(annotations: Annotation[]): string {
        if (annotations.length === 0) {
            return '# No Annotations\n\nNo annotations to export.';
        }

        let output = `# Code Review Annotations (${annotations.length} items)\n\n`;
        output += `Generated: ${new Date().toLocaleString()}\n\n`;
        output += `---\n\n`;

        // Group by file
        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const unresolvedCount = fileAnnotations.filter(a => !a.resolved).length;

            output += `## 📄 \`${relativePath}\`\n\n`;
            output += `**Status:** ${unresolvedCount} unresolved, ${fileAnnotations.length - unresolvedCount} resolved\n\n`;

            fileAnnotations.forEach((annotation, index) => {
                const lineStart = annotation.range.start.line + 1;
                const lineEnd = annotation.range.end.line + 1;
                const lineRange = lineStart === lineEnd ? `Line ${lineStart}` : `Lines ${lineStart}-${lineEnd}`;
                const status = annotation.resolved ? '✅' : '🔍';
                const tags = annotation.tags && annotation.tags.length > 0
                    ? ` \`${annotation.tags.join('` `')}\``
                    : '';

                output += `### ${status} Annotation ${index + 1}: ${lineRange}${tags}\n\n`;
                output += `**Comment:** ${annotation.comment}\n\n`;
                output += `**Code:**\n\`\`\`\n${annotation.text}\n\`\`\`\n\n`;
                output += `**Author:** ${annotation.author} | **Date:** ${new Date(annotation.timestamp).toLocaleDateString()}\n\n`;
                output += `---\n\n`;
            });
        });

        output += `\n## Summary\n\n`;
        output += `- Total Annotations: ${annotations.length}\n`;
        output += `- Unresolved: ${annotations.filter(a => !a.resolved).length}\n`;
        output += `- Resolved: ${annotations.filter(a => a.resolved).length}\n`;
        output += `- Files: ${byFile.size}\n`;

        return output;
    }

    /**
     * Export annotations in Copilot Context format (XML-style)
     */
    public static exportForCopilotContext(annotations: Annotation[]): string {
        let output = `<context>\n`;
        output += `  <annotations count="${annotations.length}" timestamp="${new Date().toISOString()}">\n`;

        annotations.forEach(annotation => {
            const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
            const lineStart = annotation.range.start.line + 1;
            const lineEnd = annotation.range.end.line + 1;

            output += `    <annotation id="${annotation.id}" status="${annotation.resolved ? 'resolved' : 'unresolved'}">\n`;
            output += `      <file>${this.escapeXml(relativePath)}</file>\n`;
            output += `      <location start="${lineStart}" end="${lineEnd}" />\n`;
            output += `      <comment>${this.escapeXml(annotation.comment)}</comment>\n`;

            if (annotation.tags && annotation.tags.length > 0) {
                output += `      <tags>\n`;
                annotation.tags.forEach(tag => {
                    output += `        <tag>${this.escapeXml(tag)}</tag>\n`;
                });
                output += `      </tags>\n`;
            }

            output += `      <code><![CDATA[\n${annotation.text}\n      ]]></code>\n`;
            output += `      <metadata author="${this.escapeXml(annotation.author)}" timestamp="${new Date(annotation.timestamp).toISOString()}" />\n`;
            output += `    </annotation>\n`;
        });

        output += `  </annotations>\n`;
        output += `</context>\n`;

        return output;
    }

    /**
     * Export annotations as individual markdown files in .copilot folder
     */
    public static async exportToWorkspace(
        annotations: Annotation[],
        workspaceRoot: string,
        sessionName?: string
    ): Promise<string[]> {
        const copilotDir = path.join(workspaceRoot, '.copilot', 'annotations');
        const session = sessionName || `session-${Date.now()}`;
        const sessionDir = path.join(copilotDir, session);

        // Ensure directory exists
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const createdFiles: string[] = [];

        // Create index file
        const indexPath = path.join(sessionDir, 'index.md');
        const indexContent = this.createIndexFile(annotations, session);
        fs.writeFileSync(indexPath, indexContent, 'utf-8');
        createdFiles.push(indexPath);

        // Group by file and create individual files
        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const safeName = relativePath.replace(/[\/\\:*?"<>|]/g, '_');
            const annotationPath = path.join(sessionDir, `${safeName}.md`);

            const content = this.createFileAnnotationDocument(fileAnnotations, relativePath);
            fs.writeFileSync(annotationPath, content, 'utf-8');
            createdFiles.push(annotationPath);
        });

        // Create .gitignore if it doesn't exist
        this.ensureGitignore(path.join(workspaceRoot, '.copilot'));

        return createdFiles;
    }

    /**
     * Create a compact format for quick copy-paste
     */
    public static exportCompact(annotations: Annotation[]): string {
        let output = '';

        annotations.forEach((annotation, index) => {
            const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
            const lineStart = annotation.range.start.line + 1;
            const lineEnd = annotation.range.end.line + 1;
            const lineRange = lineStart === lineEnd ? `L${lineStart}` : `L${lineStart}-${lineEnd}`;
            const status = annotation.resolved ? '✅' : '❌';

            output += `${index + 1}. ${status} ${relativePath}:${lineRange}\n`;
            output += `   ${annotation.comment}\n`;

            if (annotation.tags && annotation.tags.length > 0) {
                output += `   Tags: ${annotation.tags.join(', ')}\n`;
            }

            output += '\n';
        });

        return output;
    }

    /**
     * Export selected annotations with file context
     */
    public static exportWithFileContext(annotations: Annotation[]): string {
        let output = `# Annotations with File Context\n\n`;

        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);

            output += `## File: \`${relativePath}\`\n\n`;

            fileAnnotations.forEach(annotation => {
                const lineStart = annotation.range.start.line + 1;
                const lineEnd = annotation.range.end.line + 1;
                const status = annotation.resolved ? 'Resolved' : 'Unresolved';

                output += `### ${status} - Lines ${lineStart}-${lineEnd}\n\n`;
                output += `**Issue:** ${annotation.comment}\n\n`;

                if (annotation.tags && annotation.tags.length > 0) {
                    output += `**Tags:** ${annotation.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
                }

                output += `**Code:**\n\`\`\`\n${annotation.text}\n\`\`\`\n\n`;
            });
        });

        return output;
    }

    // Helper methods

    private static groupByFile(annotations: Annotation[]): Map<string, Annotation[]> {
        const grouped = new Map<string, Annotation[]>();

        annotations.forEach(annotation => {
            if (!grouped.has(annotation.filePath)) {
                grouped.set(annotation.filePath, []);
            }
            grouped.get(annotation.filePath)!.push(annotation);
        });

        // Sort annotations within each file by line number
        grouped.forEach(fileAnnotations => {
            fileAnnotations.sort((a, b) => a.range.start.line - b.range.start.line);
        });

        return grouped;
    }

    private static escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    private static createIndexFile(annotations: Annotation[], session: string): string {
        let content = `# Annotation Session: ${session}\n\n`;
        content += `**Generated:** ${new Date().toLocaleString()}\n`;
        content += `**Total Annotations:** ${annotations.length}\n\n`;

        content += `## Files\n\n`;

        const byFile = this.groupByFile(annotations);
        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const unresolvedCount = fileAnnotations.filter(a => !a.resolved).length;
            content += `- \`${relativePath}\` (${unresolvedCount} unresolved, ${fileAnnotations.length} total)\n`;
        });

        content += `\n## Quick Summary\n\n`;
        content += `- Unresolved: ${annotations.filter(a => !a.resolved).length}\n`;
        content += `- Resolved: ${annotations.filter(a => a.resolved).length}\n`;

        // Get all unique tags
        const allTags = new Set<string>();
        annotations.forEach(a => a.tags?.forEach(tag => allTags.add(tag)));
        if (allTags.size > 0) {
            content += `- Tags: ${Array.from(allTags).join(', ')}\n`;
        }

        return content;
    }

    private static createFileAnnotationDocument(annotations: Annotation[], relativePath: string): string {
        let content = `# Annotations for \`${relativePath}\`\n\n`;

        annotations.forEach((annotation, index) => {
            const lineStart = annotation.range.start.line + 1;
            const lineEnd = annotation.range.end.line + 1;
            const lineRange = lineStart === lineEnd ? `Line ${lineStart}` : `Lines ${lineStart}-${lineEnd}`;
            const status = annotation.resolved ? '✅ Resolved' : '🔍 Unresolved';

            content += `## Annotation ${index + 1}: ${lineRange}\n\n`;
            content += `**Status:** ${status}\n\n`;
            content += `**Comment:**\n${annotation.comment}\n\n`;

            if (annotation.tags && annotation.tags.length > 0) {
                content += `**Tags:** ${annotation.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
            }

            content += `**Code:**\n\`\`\`\n${annotation.text}\n\`\`\`\n\n`;
            content += `**Author:** ${annotation.author}\n`;
            content += `**Date:** ${new Date(annotation.timestamp).toLocaleString()}\n\n`;
            content += `---\n\n`;
        });

        return content;
    }

    private static ensureGitignore(copilotDir: string): void {
        const gitignorePath = path.join(copilotDir, '.gitignore');

        if (!fs.existsSync(gitignorePath)) {
            const gitignoreContent = `# Copilot annotation exports
# These are temporary files for AI context
annotations/
*.md
!README.md
`;
            fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
        }
    }
}
