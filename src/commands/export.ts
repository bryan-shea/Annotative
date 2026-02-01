/**
 * Export Commands
 * Handles: exportAnnotations, exportForCopilot, Copilot integration
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationItem } from '../ui';
import { CommandContext } from './index';
import { CopilotExporter } from '../copilotExporter';

/**
 * Helper to convert Tag to string
 */
function tagToString(tag: string | { id: string }): string {
    return typeof tag === 'string' ? tag : tag.id;
}

export function registerExportCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager } = cmdContext;

    // Command: Export annotations to clipboard
    const exportAnnotationsCommand = vscode.commands.registerCommand(
        'annotative.exportAnnotations',
        async () => {
            try {
                const markdown = await annotationManager.exportToMarkdown();
                await vscode.env.clipboard.writeText(markdown);
                vscode.window.showInformationMessage('Copied to clipboard');
            } catch (error) {
                vscode.window.showErrorMessage('Export failed');
            }
        }
    );

    // Command: Show export in new document
    const showExportCommand = vscode.commands.registerCommand(
        'annotative.showExport',
        async () => {
            try {
                const markdown = await annotationManager.exportToMarkdown();
                const doc = await vscode.workspace.openTextDocument({
                    content: markdown,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage('Export failed');
            }
        }
    );

    // Command: Export for GitHub Copilot
    const exportForCopilotCommand = vscode.commands.registerCommand(
        'annotative.exportForCopilot',
        async () => {
            const annotations = annotationManager.getAllAnnotations();
            if (annotations.length === 0) {
                vscode.window.showInformationMessage('No annotations to export');
                return;
            }

            const markdown = CopilotExporter.exportForCopilotChat(annotations);

            // Copy to clipboard
            await vscode.env.clipboard.writeText(markdown);

            const action = await vscode.window.showInformationMessage(
                `Exported ${annotations.length} annotation(s). Paste into Copilot Chat.`,
                'Save to Workspace',
                'View Output'
            );

            if (action === 'Save to Workspace') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    await CopilotExporter.exportToWorkspace(annotations, workspaceRoot);
                    vscode.window.showInformationMessage('Saved to .copilot/annotations');
                } else {
                    vscode.window.showWarningMessage('No workspace folder');
                }
            } else if (action === 'View Output') {
                const doc = await vscode.workspace.openTextDocument({
                    content: markdown,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            }
        }
    );

    // Command: Export selected annotations for GitHub Copilot
    const exportSelectedForCopilotCommand = vscode.commands.registerCommand(
        'annotative.exportSelectedForCopilot',
        async (selectedIds: string[]) => {
            if (!selectedIds || selectedIds.length === 0) {
                vscode.window.showInformationMessage('No annotations selected');
                return;
            }

            const allAnnotations = annotationManager.getAllAnnotations();
            const selectedAnnotations = allAnnotations.filter(a => selectedIds.includes(a.id));

            if (selectedAnnotations.length === 0) {
                vscode.window.showWarningMessage('Selected annotations not found');
                return;
            }

            const markdown = CopilotExporter.exportForCopilotChat(selectedAnnotations);

            // Copy to clipboard
            await vscode.env.clipboard.writeText(markdown);

            const action = await vscode.window.showInformationMessage(
                `Exported ${selectedAnnotations.length} annotation(s). Paste into Copilot Chat.`,
                'Save to Workspace',
                'View Output'
            );

            if (action === 'Save to Workspace') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    await CopilotExporter.exportToWorkspace(selectedAnnotations, workspaceRoot);
                    vscode.window.showInformationMessage('Saved to .copilot/annotations');
                } else {
                    vscode.window.showWarningMessage('No workspace folder');
                }
            } else if (action === 'View Output') {
                const doc = await vscode.workspace.openTextDocument({
                    content: markdown,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            }
        }
    );

    // Command: Ask Copilot About Annotation
    const askCopilotAboutAnnotationCommand = vscode.commands.registerCommand(
        'annotative.askCopilotAboutAnnotation',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            try {
                // Format annotation for Copilot
                const prompt = await CopilotExporter.formatAnnotationForCopilot(annotation, {
                    contextLines: 5,
                    smartContext: true
                });

                // Copy to clipboard
                await vscode.env.clipboard.writeText(prompt);

                // Try to open Copilot Chat
                try {
                    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    vscode.window.showInformationMessage(
                        'Context copied. Paste into Copilot Chat (Ctrl+V)',
                        'Got it'
                    );
                } catch (err) {
                    vscode.window.showInformationMessage(
                        'Context copied. Open Copilot Chat and paste.',
                        'Open Chat'
                    ).then(action => {
                        if (action === 'Open Chat') {
                            vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                        }
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    // Command: Copy as Copilot Context (Quick Format)
    const copyAsCopilotContextCommand = vscode.commands.registerCommand(
        'annotative.copyAsCopilotContext',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            try {
                const quickContext = await CopilotExporter.formatAsQuickContext(annotation);
                await vscode.env.clipboard.writeText(quickContext);

                vscode.window.showInformationMessage('Copied to clipboard');
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    // Command: Export by Intent (Filter for specific purposes)
    const exportByIntentCommand = vscode.commands.registerCommand(
        'annotative.exportByIntent',
        async () => {
            const intent = await vscode.window.showQuickPick([
                { label: 'Code Review', value: 'review', description: 'Unresolved annotations' },
                { label: 'Bug Fixes', value: 'bugs', description: 'Bugs and security issues' },
                { label: 'Optimization', value: 'optimization', description: 'Performance items' },
                { label: 'Documentation', value: 'documentation', description: 'Docs needed' }
            ], {
                placeHolder: 'Select export intent'
            });

            if (!intent) {
                return;
            }

            const annotations = annotationManager.getAllAnnotations();
            const exported = CopilotExporter.exportByIntent(
                annotations,
                intent.value as 'review' | 'bugs' | 'optimization' | 'documentation'
            );

            await vscode.env.clipboard.writeText(exported);

            const action = await vscode.window.showInformationMessage(
                `Exported ${intent.label} annotations`,
                'View Output',
                'Save to File'
            );

            if (action === 'View Output') {
                const doc = await vscode.workspace.openTextDocument({
                    content: exported,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } else if (action === 'Save to File') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    await CopilotExporter.exportToWorkspace(
                        annotations.filter(a => !a.resolved),
                        workspaceRoot,
                        intent.value
                    );
                    vscode.window.showInformationMessage('Saved to .copilot/annotations');
                }
            }
        }
    );

    // Command: Export for Different AI Tools
    const exportForAICommand = vscode.commands.registerCommand(
        'annotative.exportForAI',
        async () => {
            const format = await vscode.window.showQuickPick([
                { label: 'GitHub Copilot', value: 'copilot', description: 'Conversational' },
                { label: 'ChatGPT', value: 'chatgpt', description: 'Markdown + system prompt' },
                { label: 'Claude', value: 'claude', description: 'XML structured' },
                { label: 'Generic', value: 'generic', description: 'Universal' }
            ], {
                placeHolder: 'Select AI tool format'
            });

            if (!format) {
                return;
            }

            const includeResolved = await vscode.window.showQuickPick([
                { label: 'Unresolved only', value: false },
                { label: 'Include resolved', value: true }
            ], {
                placeHolder: 'Include resolved?'
            });

            if (includeResolved === undefined) {
                return;
            }

            const allAnnotations = annotationManager.getAllAnnotations();
            const annotations = includeResolved.value
                ? allAnnotations
                : allAnnotations.filter(a => !a.resolved);

            if (annotations.length === 0) {
                vscode.window.showInformationMessage('No annotations to export');
                return;
            }

            const exported = CopilotExporter.exportForAI(annotations, {
                format: format.value as any,
                includeResolved: includeResolved.value,
                contextLines: 5,
                includeImports: false,
                includeFunction: false
            });

            await vscode.env.clipboard.writeText(exported);

            vscode.window.showInformationMessage(
                `Exported ${annotations.length} for ${format.label}`,
                'View Output'
            ).then(action => {
                if (action === 'View Output') {
                    vscode.workspace.openTextDocument({
                        content: exported,
                        language: format.value === 'claude' ? 'xml' : 'markdown'
                    }).then(doc => vscode.window.showTextDocument(doc));
                }
            });
        }
    );

    // Command: Batch AI Review
    const batchAIReviewCommand = vscode.commands.registerCommand(
        'annotative.batchAIReview',
        async () => {
            const allAnnotations = annotationManager.getAllAnnotations();
            const unresolved = allAnnotations.filter(a => !a.resolved);

            if (unresolved.length === 0) {
                vscode.window.showInformationMessage('No unresolved annotations');
                return;
            }

            const maxToReview = 10; // Limit to prevent overwhelming
            const toReview = unresolved.slice(0, maxToReview);

            const proceed = await vscode.window.showInformationMessage(
                `Review ${toReview.length} annotation(s) with AI?`,
                `Review ${toReview.length}`,
                'Cancel'
            );

            if (proceed !== `Review ${toReview.length}`) {
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Preparing AI Review',
                cancellable: false
            }, async (progress) => {
                let fullReport = `# Batch AI Review Report\n\n`;
                fullReport += `Generated: ${new Date().toLocaleString()}\n`;
                fullReport += `Annotations Reviewed: ${toReview.length}\n\n`;
                fullReport += `---\n\n`;

                for (let i = 0; i < toReview.length; i++) {
                    const annotation = toReview[i];

                    progress.report({
                        message: `Processing ${i + 1}/${toReview.length}`,
                        increment: (100 / toReview.length)
                    });

                    // Format each annotation
                    const formatted = await CopilotExporter.formatAnnotationForCopilot(annotation, {
                        contextLines: 5,
                        smartContext: true
                    });

                    fullReport += formatted;
                    fullReport += `\n\n---\n\n`;

                    // Small delay to prevent overwhelming
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                fullReport += `\n## Summary\n\n`;
                fullReport += `Total Annotations: ${toReview.length}\n`;

                // Count by tag
                const tagCounts = new Map<string, number>();
                toReview.forEach(a => {
                    a.tags?.forEach(tag => {
                        const tagStr = tagToString(tag);
                        tagCounts.set(tagStr, (tagCounts.get(tagStr) || 0) + 1);
                    });
                });

                if (tagCounts.size > 0) {
                    fullReport += `\nBy Type:\n`;
                    tagCounts.forEach((count, tag) => {
                        fullReport += `- ${tag}: ${count}\n`;
                    });
                }

                // Copy to clipboard
                await vscode.env.clipboard.writeText(fullReport);

                const action = await vscode.window.showInformationMessage(
                    `Batch review ready. Copied to clipboard.`,
                    'View Report',
                    'Open Copilot Chat',
                    'Save to File'
                );

                if (action === 'View Report') {
                    const doc = await vscode.workspace.openTextDocument({
                        content: fullReport,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);
                } else if (action === 'Open Copilot Chat') {
                    try {
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    } catch {
                        vscode.window.showInformationMessage('Open Copilot Chat and paste report');
                    }
                } else if (action === 'Save to File') {
                    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (workspaceRoot) {
                        await CopilotExporter.exportToWorkspace(toReview, workspaceRoot, 'batch-review');
                        vscode.window.showInformationMessage('Saved to .copilot/annotations');
                    }
                }
            });
        }
    );

    return {
        exportAnnotationsCommand,
        showExportCommand,
        exportForCopilotCommand,
        exportSelectedForCopilotCommand,
        askCopilotAboutAnnotationCommand,
        copyAsCopilotContextCommand,
        exportByIntentCommand,
        exportForAICommand,
        batchAIReviewCommand
    };
}
