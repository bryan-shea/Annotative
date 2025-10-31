import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Annotation, CopilotExportOptions, ExportOptions } from './types';

export enum CopilotExportFormat {
    Chat = 'chat',           // Optimized for pasting into Copilot Chat
    Context = 'context',     // XML-style context format
    Workspace = 'workspace', // Save to .copilot folder
    ChatGPT = 'chatgpt',     // Optimized for ChatGPT
    Claude = 'claude',       // Optimized for Claude (XML-structured)
    Generic = 'generic'      // Universal format
}

export class CopilotExporter {

    /**
     * Format a single annotation for Copilot Chat with context
     */
    public static async formatAnnotationForCopilot(
        annotation: Annotation,
        options: CopilotExportOptions = {}
    ): Promise<string> {
        const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
        const lineStart = annotation.range.start.line + 1;
        const lineEnd = annotation.range.end.line + 1;
        const contextLines = options.contextLines ?? 5;

        let output = `# Code Review Context from Annotative\n\n`;
        output += `## File: \`${relativePath}\` (Lines ${lineStart}-${lineEnd})\n\n`;

        // Add annotation details
        const status = annotation.resolved ? 'Resolved' : 'Unresolved';
        output += `### Annotation: ${annotation.comment}\n\n`;
        output += `**Author:** ${annotation.author}\n`;
        output += `**Status:** ${status}\n`;

        if (annotation.tags && annotation.tags.length > 0) {
            const tagEmojis = this.getTagEmojis(annotation.tags);
            output += `**Tags:** ${tagEmojis} ${annotation.tags.join(', ')}\n`;
        }

        output += `\n`;

        // Get code with context
        const codeContext = await this.getCodeContext(annotation, options);
        const languageId = await this.getLanguageId(annotation.filePath);

        output += `**Code:**\n\`\`\`${languageId}\n${codeContext}\n\`\`\`\n\n`;

        // Add smart prompt based on tags
        const prompt = this.generateSmartPrompt(annotation);
        if (prompt) {
            output += `**Request:** ${prompt}\n`;
        }

        return output;
    }

    /**
     * Copy annotation as Copilot context (compact format)
     */
    public static async formatAsQuickContext(annotation: Annotation): Promise<string> {
        const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
        const lineStart = annotation.range.start.line + 1;
        const lineEnd = annotation.range.end.line + 1;
        const languageId = await this.getLanguageId(annotation.filePath);

        let output = `I'm reviewing this code and found an issue. Can you help?\n\n`;
        output += `**File:** ${relativePath}:${lineStart}-${lineEnd}\n`;
        output += `**Issue:** ${annotation.comment}\n`;

        if (annotation.tags && annotation.tags.length > 0) {
            output += `**Tags:** ${annotation.tags.join(', ')}\n`;
        }

        output += `\n\`\`\`${languageId}\n${annotation.text}\n\`\`\`\n\n`;
        output += `What would you suggest?\n`;

        return output;
    }

    /**
     * Export multiple annotations with filtering by intent
     */
    public static exportByIntent(
        annotations: Annotation[],
        intent: 'review' | 'bugs' | 'optimization' | 'documentation'
    ): string {
        let filtered: Annotation[];
        let title: string;

        switch (intent) {
            case 'review':
                filtered = annotations.filter(a => !a.resolved);
                title = 'Code Review';
                break;
            case 'bugs':
                filtered = annotations.filter(a =>
                    a.tags?.some(t => ['bug', 'security'].includes(t.toLowerCase()))
                );
                title = 'Bug Fixes and Security Issues';
                break;
            case 'optimization':
                filtered = annotations.filter(a =>
                    a.tags?.some(t => ['performance', 'optimization'].includes(t.toLowerCase()))
                );
                title = 'Performance Optimization';
                break;
            case 'documentation':
                filtered = annotations.filter(a =>
                    a.tags?.some(t => ['docs', 'documentation', 'question'].includes(t.toLowerCase()))
                );
                title = 'Documentation Needs';
                break;
        }

        return this.exportForCopilotChat(filtered, title);
    }

    /**
     * Export in different AI tool formats
     */
    public static exportForAI(annotations: Annotation[], options: ExportOptions): string {
        switch (options.format) {
            case 'copilot':
                return this.exportForCopilotChat(annotations);
            case 'chatgpt':
                return this.exportForChatGPT(annotations, options);
            case 'claude':
                return this.exportForClaude(annotations, options);
            case 'generic':
            default:
                return this.exportGeneric(annotations, options);
        }
    }

    /**
     * Export for ChatGPT (markdown with system prompt structure)
     */
    private static exportForChatGPT(annotations: Annotation[], options: ExportOptions): string {
        let output = `# Code Review Request\n\n`;
        output += `I have ${annotations.length} code annotations that need review. Please analyze each one and provide suggestions.\n\n`;

        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            output += `## File: \`${relativePath}\`\n\n`;

            fileAnnotations.forEach((annotation, idx) => {
                const lineStart = annotation.range.start.line + 1;
                const lineEnd = annotation.range.end.line + 1;

                output += `### Issue ${idx + 1} (Lines ${lineStart}-${lineEnd})\n\n`;
                output += `**Problem:** ${annotation.comment}\n\n`;

                if (annotation.tags && annotation.tags.length > 0) {
                    output += `**Categories:** ${annotation.tags.join(', ')}\n\n`;
                }

                output += `\`\`\`\n${annotation.text}\n\`\`\`\n\n`;
            });
        });

        output += `\n---\n\n`;
        output += `Please provide:\n`;
        output += `1. Analysis of each issue\n`;
        output += `2. Suggested fixes or improvements\n`;
        output += `3. Potential side effects to consider\n`;
        output += `4. Best practices recommendations\n`;

        return output;
    }

    /**
     * Export for Claude (XML-structured for Claude's preference)
     */
    private static exportForClaude(annotations: Annotation[], options: ExportOptions): string {
        let output = `<code_review>\n`;
        output += `<context>\n`;
        output += `I need your help reviewing ${annotations.length} code annotations.\n`;
        output += `</context>\n\n`;

        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            output += `<file path="${this.escapeXml(relativePath)}">\n`;

            fileAnnotations.forEach((annotation) => {
                const lineStart = annotation.range.start.line + 1;
                const lineEnd = annotation.range.end.line + 1;

                output += `  <annotation>\n`;
                output += `    <location lines="${lineStart}-${lineEnd}"/>\n`;
                output += `    <issue>${this.escapeXml(annotation.comment)}</issue>\n`;

                if (annotation.tags && annotation.tags.length > 0) {
                    output += `    <tags>${annotation.tags.map(t => this.escapeXml(t)).join(', ')}</tags>\n`;
                }

                output += `    <code>\n${this.escapeXml(annotation.text)}\n    </code>\n`;
                output += `  </annotation>\n`;
            });

            output += `</file>\n`;
        });

        output += `\n<request>\n`;
        output += `Please analyze each annotation and provide:\n`;
        output += `- Root cause analysis\n`;
        output += `- Recommended solutions\n`;
        output += `- Code examples where applicable\n`;
        output += `</request>\n`;
        output += `</code_review>\n`;

        return output;
    }

    /**
     * Generic export format (universal)
     */
    private static exportGeneric(annotations: Annotation[], options: ExportOptions): string {
        return this.exportForCopilotChat(annotations);
    }

    /**
     * Generate smart prompts based on annotation tags
     */
    private static generateSmartPrompt(annotation: Annotation): string | null {
        if (!annotation.tags || annotation.tags.length === 0) {
            return null;
        }

        const tagLower = annotation.tags.map(t => t.toLowerCase());

        if (tagLower.includes('performance')) {
            return 'Can you suggest optimizations focusing on time/space complexity and caching strategies?';
        }
        if (tagLower.includes('security')) {
            return 'Can you review this for security issues, checking OWASP top 10, input validation, and authentication?';
        }
        if (tagLower.includes('bug')) {
            return 'Can you help identify the root cause and suggest tests to prevent regression?';
        }
        if (tagLower.includes('style') || tagLower.includes('refactor')) {
            return 'Can you suggest code improvements following best practices and design patterns?';
        }
        if (tagLower.includes('docs') || tagLower.includes('documentation')) {
            return 'Can you help generate comprehensive documentation for this code?';
        }
        if (tagLower.includes('question')) {
            return 'Can you explain how this code works and suggest any improvements?';
        }

        return 'Can you review this code and provide suggestions?';
    }

    /**
     * Get code context with surrounding lines
     */
    private static async getCodeContext(
        annotation: Annotation,
        options: CopilotExportOptions
    ): Promise<string> {
        const contextLines = options.contextLines ?? 5;

        try {
            const document = await vscode.workspace.openTextDocument(annotation.filePath);
            const startLine = Math.max(0, annotation.range.start.line - contextLines);
            const endLine = Math.min(document.lineCount - 1, annotation.range.end.line + contextLines);

            let context = '';

            for (let i = startLine; i <= endLine; i++) {
                const line = document.lineAt(i).text;
                const lineNumber = i + 1;
                const marker = (i >= annotation.range.start.line && i <= annotation.range.end.line) ? '> ' : '  ';
                context += `${marker}${lineNumber}: ${line}\n`;
            }

            return context;
        } catch (error) {
            // Fallback to just the annotation text
            return annotation.text;
        }
    }

    /**
     * Get language ID for syntax highlighting
     */
    private static async getLanguageId(filePath: string): Promise<string> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            return document.languageId;
        } catch (error) {
            // Fallback based on file extension
            const ext = path.extname(filePath).toLowerCase();
            const langMap: { [key: string]: string } = {
                '.ts': 'typescript',
                '.tsx': 'typescriptreact',
                '.js': 'javascript',
                '.jsx': 'javascriptreact',
                '.py': 'python',
                '.java': 'java',
                '.c': 'c',
                '.cpp': 'cpp',
                '.cs': 'csharp',
                '.go': 'go',
                '.rs': 'rust',
                '.rb': 'ruby',
                '.php': 'php',
                '.swift': 'swift',
                '.kt': 'kotlin',
                '.scala': 'scala'
            };
            return langMap[ext] || 'text';
        }
    }

    /**
     * Get tag emojis - Removed, no longer using emojis
     */
    private static getTagEmojis(tags: string[]): string {
        // Return empty string since we're not using emojis
        return '';
    }

    /**
     * Export annotations in Copilot Chat optimized format
     */
    public static exportForCopilotChat(annotations: Annotation[], title?: string): string {
        if (annotations.length === 0) {
            return '# No Annotations\n\nNo annotations to export.';
        }

        let output = `# ${title || `Code Review Annotations (${annotations.length} items)`}\n\n`;
        output += `Generated: ${new Date().toLocaleString()}\n\n`;
        output += `---\n\n`;

        // Group by file
        const byFile = this.groupByFile(annotations);

        byFile.forEach((fileAnnotations, filePath) => {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const unresolvedCount = fileAnnotations.filter(a => !a.resolved).length;

            output += `## \`${relativePath}\`\n\n`;
            output += `**Status:** ${unresolvedCount} unresolved, ${fileAnnotations.length - unresolvedCount} resolved\n\n`;

            fileAnnotations.forEach((annotation, index) => {
                const lineStart = annotation.range.start.line + 1;
                const lineEnd = annotation.range.end.line + 1;
                const lineRange = lineStart === lineEnd ? `Line ${lineStart}` : `Lines ${lineStart}-${lineEnd}`;
                const status = annotation.resolved ? '[Resolved]' : '[Open]';
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
            const status = annotation.resolved ? '[Resolved]' : '[Open]';

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
            const status = annotation.resolved ? 'Resolved' : 'Unresolved';

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
