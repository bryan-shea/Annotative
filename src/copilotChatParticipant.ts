import * as vscode from 'vscode';
import { AnnotationManager } from './annotationManager';
import { CopilotExporter } from './copilotExporter';
import { Annotation } from './types';

/**
 * Register the @annotative chat participant for GitHub Copilot Chat
 */
export function registerChatParticipant(
    context: vscode.ExtensionContext,
    annotationManager: AnnotationManager
): vscode.Disposable {

    const participant = vscode.chat.createChatParticipant(
        'annotative.participant',
        async (request, context, stream, token) => {
            try {
                const command = request.command;

                // Handle different commands
                switch (command) {
                    case 'issues':
                        await handleIssuesCommand(stream, annotationManager, request);
                        break;
                    case 'explain':
                        await handleExplainCommand(stream, annotationManager, request);
                        break;
                    case 'fix':
                        await handleFixCommand(stream, annotationManager, request);
                        break;
                    case 'review':
                        await handleReviewCommand(stream, annotationManager, request);
                        break;
                    default:
                        await handleDefaultRequest(stream, annotationManager, request);
                }
            } catch (error) {
                stream.markdown(`\n\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
            }

            return {};
        }
    );

    // Set icon for the participant
    participant.iconPath = vscode.Uri.joinPath(
        context.extensionUri,
        'images',
        'icon.png'
    );

    return participant;
}

/**
 * Handle /issues command - Show all unresolved annotations
 */
async function handleIssuesCommand(
    stream: vscode.ChatResponseStream,
    manager: AnnotationManager,
    request: vscode.ChatRequest
): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    let annotations: Annotation[];

    // Determine scope - current file or all files
    if (request.prompt.toLowerCase().includes('current') || request.prompt.toLowerCase().includes('this file')) {
        if (!editor) {
            stream.markdown('No active editor. Showing all unresolved annotations.\n\n');
            annotations = manager.getAllAnnotations().filter(a => !a.resolved);
        } else {
            const filePath = editor.document.uri.fsPath;
            annotations = manager.getAnnotationsForFile(filePath).filter(a => !a.resolved);
            stream.markdown(`# Unresolved Annotations in Current File\n\n`);
        }
    } else {
        annotations = manager.getAllAnnotations().filter(a => !a.resolved);
        stream.markdown(`# All Unresolved Annotations\n\n`);
    }

    if (annotations.length === 0) {
        stream.markdown('✅ No unresolved annotations found!\n');
        return;
    }

    stream.markdown(`Found ${annotations.length} unresolved annotation(s):\n\n`);

    // Group by file
    const byFile = new Map<string, Annotation[]>();
    annotations.forEach(a => {
        if (!byFile.has(a.filePath)) {
            byFile.set(a.filePath, []);
        }
        byFile.get(a.filePath)!.push(a);
    });

    byFile.forEach((fileAnnotations, filePath) => {
        const relativePath = vscode.workspace.asRelativePath(filePath);
        stream.markdown(`\n**📄 ${relativePath}** (${fileAnnotations.length} issues)\n\n`);

        fileAnnotations.forEach(annotation => {
            const lineStart = annotation.range.start.line + 1;
            const lineEnd = annotation.range.end.line + 1;
            const lineRange = lineStart === lineEnd ? `L${lineStart}` : `L${lineStart}-${lineEnd}`;
            const tags = annotation.tags && annotation.tags.length > 0
                ? ` \`${annotation.tags.join('` `')}\``
                : '';

            stream.markdown(`- **${lineRange}**${tags}: ${annotation.comment}\n`);
        });
    });

    stream.markdown(`\n\nUse \`@annotative /fix\` to get suggestions for these issues.`);
}

/**
 * Handle /explain command - Explain a specific annotation
 */
async function handleExplainCommand(
    stream: vscode.ChatResponseStream,
    manager: AnnotationManager,
    request: vscode.ChatRequest
): Promise<void> {
    const allAnnotations = manager.getAllAnnotations();

    if (allAnnotations.length === 0) {
        stream.markdown('No annotations found to explain.');
        return;
    }

    // Try to extract annotation ID from prompt
    const idMatch = request.prompt.match(/#(\d+)/);
    let annotation: Annotation | undefined;

    if (idMatch) {
        const index = parseInt(idMatch[1]) - 1;
        if (index >= 0 && index < allAnnotations.length) {
            annotation = allAnnotations[index];
        }
    } else {
        // Get first unresolved annotation in active file
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const filePath = editor.document.uri.fsPath;
            const fileAnnotations = manager.getAnnotationsForFile(filePath).filter(a => !a.resolved);
            annotation = fileAnnotations[0];
        } else {
            annotation = allAnnotations.filter(a => !a.resolved)[0];
        }
    }

    if (!annotation) {
        stream.markdown('Could not find annotation to explain. Use `@annotative /explain #1` to explain a specific annotation.');
        return;
    }

    const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
    const lineStart = annotation.range.start.line + 1;
    const lineEnd = annotation.range.end.line + 1;

    stream.markdown(`# Annotation Analysis\n\n`);
    stream.markdown(`**File:** ${relativePath} (Lines ${lineStart}-${lineEnd})\n\n`);
    stream.markdown(`**Issue:** ${annotation.comment}\n\n`);

    if (annotation.tags && annotation.tags.length > 0) {
        stream.markdown(`**Tags:** ${annotation.tags.map(t => `\`${t}\``).join(', ')}\n\n`);
    }

    stream.markdown(`**Code:**\n\`\`\`\n${annotation.text}\n\`\`\`\n\n`);

    // Ask Copilot to analyze
    stream.markdown(`Based on the tags and context, here's my analysis:\n\n`);

    // Use the smart prompt generation
    const prompt = generateAnalysisPrompt(annotation);
    stream.markdown(prompt);
}

/**
 * Handle /fix command - Suggest fixes for annotations
 */
async function handleFixCommand(
    stream: vscode.ChatResponseStream,
    manager: AnnotationManager,
    request: vscode.ChatRequest
): Promise<void> {
    let annotations: Annotation[];

    // Check if user specified a tag filter
    const tagMatch = request.prompt.match(/tag\s+(\w+)/i);
    if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        annotations = manager.getAllAnnotations().filter(a =>
            !a.resolved && a.tags?.some(t => t.toLowerCase() === tag)
        );
        stream.markdown(`# Fix Suggestions for '${tag}' Annotations\n\n`);
    } else {
        annotations = manager.getAllAnnotations().filter(a => !a.resolved);
        stream.markdown(`# Fix Suggestions for All Unresolved Annotations\n\n`);
    }

    if (annotations.length === 0) {
        stream.markdown('No annotations found to fix.');
        return;
    }

    stream.markdown(`Analyzing ${annotations.length} annotation(s)...\n\n`);

    // Group by priority (security > bugs > performance > others)
    const prioritized = prioritizeAnnotations(annotations);

    for (const annotation of prioritized.slice(0, 5)) { // Limit to first 5
        const relativePath = vscode.workspace.asRelativePath(annotation.filePath);
        const lineStart = annotation.range.start.line + 1;
        const lineEnd = annotation.range.end.line + 1;

        stream.markdown(`## ${relativePath}:${lineStart}-${lineEnd}\n\n`);
        stream.markdown(`**Issue:** ${annotation.comment}\n\n`);

        if (annotation.tags && annotation.tags.length > 0) {
            const emoji = getTagEmoji(annotation.tags[0]);
            stream.markdown(`**Type:** ${emoji} ${annotation.tags.join(', ')}\n\n`);
        }

        stream.markdown(`**Suggested Fix:**\n`);
        stream.markdown(generateFixSuggestion(annotation));
        stream.markdown(`\n\n---\n\n`);
    }

    if (annotations.length > 5) {
        stream.markdown(`\n*Showing top 5 of ${annotations.length} total annotations. Use filters to see specific types.*\n`);
    }
}

/**
 * Handle /review command - AI review with annotation context
 */
async function handleReviewCommand(
    stream: vscode.ChatResponseStream,
    manager: AnnotationManager,
    request: vscode.ChatRequest
): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        stream.markdown('No active file to review. Please open a file first.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const annotations = manager.getAnnotationsForFile(filePath);
    const relativePath = vscode.workspace.asRelativePath(filePath);

    stream.markdown(`# Code Review: ${relativePath}\n\n`);

    if (annotations.length === 0) {
        stream.markdown('No existing annotations for this file. I can help you review the code if you create some annotations first!\n\n');
        stream.markdown('Use `Ctrl+Shift+A` to add annotations to sections you want reviewed.');
        return;
    }

    const unresolved = annotations.filter(a => !a.resolved);
    const resolved = annotations.filter(a => a.resolved);

    stream.markdown(`**Status:**\n`);
    stream.markdown(`- ${unresolved.length} unresolved issue(s)\n`);
    stream.markdown(`- ${resolved.length} resolved issue(s)\n\n`);

    if (unresolved.length > 0) {
        stream.markdown(`## Unresolved Issues\n\n`);

        unresolved.forEach((annotation, idx) => {
            const lineStart = annotation.range.start.line + 1;
            const lineEnd = annotation.range.end.line + 1;
            const emoji = annotation.tags ? getTagEmoji(annotation.tags[0]) : '💬';

            stream.markdown(`${idx + 1}. ${emoji} **Lines ${lineStart}-${lineEnd}**: ${annotation.comment}\n`);
        });

        stream.markdown(`\n\nWould you like me to suggest fixes? Use \`@annotative /fix\` to get detailed suggestions.`);
    } else {
        stream.markdown(`✅ All annotations have been resolved! Great work!\n`);
    }
}

/**
 * Handle default request (no specific command)
 */
async function handleDefaultRequest(
    stream: vscode.ChatResponseStream,
    manager: AnnotationManager,
    request: vscode.ChatRequest
): Promise<void> {
    const prompt = request.prompt.toLowerCase();

    // Determine intent from prompt
    if (prompt.includes('issue') || prompt.includes('problem') || prompt.includes('annotation')) {
        await handleIssuesCommand(stream, manager, request);
    } else if (prompt.includes('fix') || prompt.includes('solve') || prompt.includes('resolve')) {
        await handleFixCommand(stream, manager, request);
    } else if (prompt.includes('review')) {
        await handleReviewCommand(stream, manager, request);
    } else {
        // Show help
        stream.markdown(`# Annotative Chat Participant\n\n`);
        stream.markdown(`I can help you manage and review code annotations!\n\n`);
        stream.markdown(`## Available Commands\n\n`);
        stream.markdown(`- \`@annotative /issues\` - Show all unresolved annotations\n`);
        stream.markdown(`- \`@annotative /explain #1\` - Explain a specific annotation\n`);
        stream.markdown(`- \`@annotative /fix\` - Get fix suggestions for all issues\n`);
        stream.markdown(`- \`@annotative /fix tag security\` - Fix annotations with specific tag\n`);
        stream.markdown(`- \`@annotative /review\` - Review current file with annotation context\n\n`);
        stream.markdown(`## Examples\n\n`);
        stream.markdown(`- "Show me all security issues" → \`@annotative /issues\`\n`);
        stream.markdown(`- "How do I fix the performance problems?" → \`@annotative /fix tag performance\`\n`);
        stream.markdown(`- "Review my code" → \`@annotative /review\`\n`);
    }
}

/**
 * Generate analysis prompt based on annotation
 */
function generateAnalysisPrompt(annotation: Annotation): string {
    if (!annotation.tags || annotation.tags.length === 0) {
        return 'This appears to be a general code review note. Let me analyze the code for potential improvements.';
    }

    const tag = annotation.tags[0].toLowerCase();

    switch (tag) {
        case 'security':
            return 'This is a security concern. I\'ll check for:\n- Input validation issues\n- Authentication/authorization gaps\n- Potential injection vulnerabilities\n- Sensitive data exposure';
        case 'performance':
            return 'This is a performance issue. I\'ll analyze:\n- Time complexity\n- Space complexity\n- Caching opportunities\n- Optimization strategies';
        case 'bug':
            return 'This is a bug report. I\'ll investigate:\n- Root cause\n- Edge cases\n- Potential side effects\n- Testing recommendations';
        case 'style':
        case 'refactor':
            return 'This is a code quality concern. I\'ll suggest:\n- Design pattern improvements\n- Code organization\n- Readability enhancements\n- Best practices';
        default:
            return `This is tagged as '${tag}'. I'll provide relevant analysis and suggestions.`;
    }
}

/**
 * Generate fix suggestion based on annotation
 */
function generateFixSuggestion(annotation: Annotation): string {
    if (!annotation.tags || annotation.tags.length === 0) {
        return '*Review the code and apply best practices for your language and framework.*';
    }

    const tag = annotation.tags[0].toLowerCase();

    switch (tag) {
        case 'security':
            return '*Apply input validation, sanitization, and proper authentication checks.*';
        case 'performance':
            return '*Consider memoization, caching, or algorithmic improvements to reduce complexity.*';
        case 'bug':
            return '*Debug the issue, add error handling, and write tests to prevent regression.*';
        case 'style':
        case 'refactor':
            return '*Refactor to improve readability, follow SOLID principles, and use appropriate design patterns.*';
        default:
            return '*Apply relevant best practices based on the context.*';
    }
}

/**
 * Prioritize annotations (security > bugs > performance > others)
 */
function prioritizeAnnotations(annotations: Annotation[]): Annotation[] {
    const priority = { security: 0, bug: 1, performance: 2 };

    return annotations.sort((a, b) => {
        const aTag = a.tags?.[0]?.toLowerCase() || 'zzz';
        const bTag = b.tags?.[0]?.toLowerCase() || 'zzz';
        const aPriority = priority[aTag as keyof typeof priority] ?? 99;
        const bPriority = priority[bTag as keyof typeof priority] ?? 99;
        return aPriority - bPriority;
    });
}

/**
 * Get emoji for tag
 */
function getTagEmoji(tag: string): string {
    const emojiMap: { [key: string]: string } = {
        bug: '🐛',
        security: '🔒',
        performance: '⚡',
        style: '🎨',
        docs: '📝',
        question: '❓',
        improvement: '💡',
        refactor: '♻️',
        test: '🧪'
    };
    return emojiMap[tag.toLowerCase()] || '💬';
}

/**
 * Register chat variable for #annotations (if available in VS Code API)
 * Note: Chat variables API may not be available in all VS Code versions
 */
export function registerChatVariableIfAvailable(
    context: vscode.ExtensionContext,
    annotationManager: AnnotationManager
): vscode.Disposable | undefined {

    // Check if chat variable API is available
    if (typeof (vscode.chat as any).registerVariable === 'function') {
        try {
            return (vscode.chat as any).registerVariable(
                'annotations',
                'annotations',
                {
                    resolve: async (name: string, context: any, token: any) => {
                        const editor = vscode.window.activeTextEditor;
                        if (!editor) {
                            return [];
                        }

                        const filePath = editor.document.uri.fsPath;
                        const annotations = annotationManager.getAnnotationsForFile(filePath);

                        if (annotations.length === 0) {
                            return [];
                        }

                        // Format annotations for chat context
                        const formatted = annotations.map(a => {
                            const lineStart = a.range.start.line + 1;
                            const lineEnd = a.range.end.line + 1;
                            const status = a.resolved ? '✅' : '🔍';
                            const tags = a.tags && a.tags.length > 0 ? ` [${a.tags.join(', ')}]` : '';

                            return {
                                level: 1, // Short level
                                value: `${status} L${lineStart}-${lineEnd}${tags}: ${a.comment}`,
                                description: a.text
                            };
                        });

                        return formatted;
                    }
                }
            );
        } catch (error) {
            console.warn('Chat variable registration failed:', error);
            return undefined;
        }
    }

    return undefined;
}