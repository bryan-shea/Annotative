/**
 * Annotation Commands
 * Handles: add, remove, toggle, edit, view, undo
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

export function registerAnnotationCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, sidebarWebview, ANNOTATION_COLORS } = cmdContext;

    // Command: Add annotation to selected text
    const addAnnotationCommand = vscode.commands.registerTextEditorCommand(
        'annotative.addAnnotation',
        async (editor: vscode.TextEditor) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showWarningMessage('Select text to annotate.');
                return;
            }

            // Get comment via input box
            const comment = await vscode.window.showInputBox({
                prompt: 'Add a comment',
                placeHolder: 'Describe the issue or note',
                validateInput: (value) => {
                    return value.trim().length === 0 ? 'Comment required' : null;
                }
            });

            if (!comment) {
                return;
            }

            // Get available tags (user-defined only)
            const customTags = annotationManager.getCustomTags();
            let selectedTags: string[] = [];

            if (customTags.length > 0) {
                const tagOptions = customTags.map(t => t.name);
                selectedTags = await vscode.window.showQuickPick(tagOptions, {
                    placeHolder: 'Select tags (optional)',
                    canPickMany: true
                }) || [];
            }

            // Get color via quick pick
            const selectedColor = await vscode.window.showQuickPick(ANNOTATION_COLORS, {
                placeHolder: 'Select a color'
            });

            const color = selectedColor?.value || '#ffc107';

            await annotationManager.addAnnotation(
                editor,
                selection,
                comment,
                selectedTags,
                color
            );
            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage('Annotation added.');
        }
    );

    // Command: Add annotation from template
    const addAnnotationFromTemplateCommand = vscode.commands.registerTextEditorCommand(
        'annotative.addAnnotationFromTemplate',
        async (editor: vscode.TextEditor) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showWarningMessage('Select text to annotate.');
                return;
            }

            // Show template picker
            const template = await vscode.window.showQuickPick([
                {
                    label: 'Review Code',
                    comment: 'Review this code for correctness and best practices',
                    tags: [],
                    detail: 'General code review'
                },
                {
                    label: 'Explain',
                    comment: 'Explain how this code works',
                    tags: [],
                    detail: 'Request explanation'
                },
                {
                    label: 'Optimize',
                    comment: 'Suggest optimizations for better performance',
                    tags: [],
                    detail: 'Performance improvements'
                },
                {
                    label: 'Find Issues',
                    comment: 'Review for potential bugs and edge cases',
                    tags: [],
                    detail: 'Bug detection'
                },
                {
                    label: 'Security Check',
                    comment: 'Check for security vulnerabilities',
                    tags: [],
                    detail: 'Security review'
                },
                {
                    label: 'Document',
                    comment: 'Generate documentation for this code',
                    tags: [],
                    detail: 'Documentation'
                },
                {
                    label: 'Refactor',
                    comment: 'Suggest refactoring to improve code quality',
                    tags: [],
                    detail: 'Code improvement'
                },
                {
                    label: 'Add Tests',
                    comment: 'Suggest unit tests for this code',
                    tags: [],
                    detail: 'Test coverage'
                }
            ], {
                placeHolder: 'Select a template',
                matchOnDetail: true
            });

            if (!template) {
                return;
            }

            // Prompt for tags if custom tags exist
            const customTags = annotationManager.getCustomTags();
            let selectedTags: string[] = [];

            if (customTags.length > 0) {
                const tagOptions = customTags.map(t => t.name);
                const tags = await vscode.window.showQuickPick(tagOptions, {
                    placeHolder: 'Select tags (optional)',
                    canPickMany: true
                });
                if (tags) {
                    selectedTags = tags;
                }
            }

            // Add annotation with template and selected tags
            await annotationManager.addAnnotation(
                editor,
                selection,
                template.comment,
                selectedTags
            );
            sidebarWebview.refreshAnnotations();

            // Ask if user wants to send to Copilot immediately
            const action = await vscode.window.showInformationMessage(
                `Annotation added: ${template.label}`,
                'Ask Copilot',
                'Done'
            );

            if (action === 'Ask Copilot') {
                const annotations = annotationManager.getAnnotationsForFile(editor.document.uri.fsPath);
                const newAnnotation = annotations[annotations.length - 1];

                if (newAnnotation) {
                    const prompt = await CopilotExporter.formatAnnotationForCopilot(newAnnotation, {
                        contextLines: 5,
                        smartContext: true
                    });

                    await vscode.env.clipboard.writeText(prompt);

                    try {
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                        vscode.window.showInformationMessage('Paste into Copilot Chat (Ctrl+V)');
                    } catch {
                        vscode.window.showInformationMessage('Context copied. Open Copilot Chat and paste.');
                    }
                }
            }
        }
    );

    // Command: Remove annotation
    const removeAnnotationCommand = vscode.commands.registerCommand(
        'annotative.removeAnnotation',
        async (item: AnnotationItem) => {
            const confirmed = await vscode.window.showWarningMessage(
                'Remove this annotation?',
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                await annotationManager.removeAnnotation(item.annotation.id, item.annotation.filePath);
                sidebarWebview.refreshAnnotations();
                vscode.window.showInformationMessage('Annotation removed.');
            }
        }
    );

    // Command: Toggle resolved status
    const toggleResolvedCommand = vscode.commands.registerCommand(
        'annotative.toggleResolved',
        async (item: AnnotationItem) => {
            await annotationManager.toggleResolvedStatus(item.annotation.id, item.annotation.filePath);
            sidebarWebview.refreshAnnotations();

            const status = item.annotation.resolved ? 'open' : 'resolved';
            vscode.window.showInformationMessage(`Status: ${status}`);
        }
    );

    // Command: Edit annotation
    const editAnnotationCommand = vscode.commands.registerCommand(
        'annotative.editAnnotation',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Get updated comment via input box
            const comment = await vscode.window.showInputBox({
                prompt: 'Edit comment',
                value: annotation.comment,
                validateInput: (value) => {
                    return value.trim().length === 0 ? 'Comment required' : null;
                }
            });

            if (!comment) {
                return;
            }

            // Get updated tags via quick pick (multi-select) - user-defined only
            const customTags = annotationManager.getCustomTags();
            let tagsToUse = annotation.tags?.map((t) => tagToString(t)) || [];

            if (customTags.length > 0) {
                const tagOptions = customTags.map(t => t.name);
                const selectedTags = await vscode.window.showQuickPick(tagOptions, {
                    placeHolder: 'Select tags (optional)',
                    canPickMany: true
                });
                if (selectedTags) {
                    tagsToUse = selectedTags;
                }
            }

            // Get updated color via quick pick
            const selectedColor = await vscode.window.showQuickPick(ANNOTATION_COLORS, {
                placeHolder: 'Select a color'
            });

            const color = selectedColor?.value || annotation.color || '#ffc107';

            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                comment,
                tagsToUse,
                color
            );
            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage('Annotation updated.');
        }
    );

    // Command: View annotation (read-only)
    const viewAnnotationCommand = vscode.commands.registerCommand(
        'annotative.viewAnnotation',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Navigate to the annotation
            await vscode.commands.executeCommand('annotative.goToAnnotation', annotation);

            // Show details in information message
            const tagsStr = annotation.tags && annotation.tags.length > 0
                ? annotation.tags.map(t => tagToString(t)).join(', ')
                : 'none';
            const resolvedStr = annotation.resolved ? 'Resolved' : 'Open';

            vscode.window.showInformationMessage(
                `${resolvedStr} | Tags: ${tagsStr} | ${annotation.comment}`,
                { modal: false }
            );
        }
    );

    // Command: Undo last annotation
    const undoLastAnnotationCommand = vscode.commands.registerCommand(
        'annotative.undoLastAnnotation',
        async () => {
            const undoneAnnotation = await annotationManager.undoLastAnnotation();
            if (undoneAnnotation) {
                sidebarWebview.refreshAnnotations();
                vscode.window.showInformationMessage('Last annotation removed');
            } else {
                vscode.window.showWarningMessage('No annotation to undo');
            }
        }
    );

    return {
        addAnnotationCommand,
        addAnnotationFromTemplateCommand,
        removeAnnotationCommand,
        toggleResolvedCommand,
        editAnnotationCommand,
        viewAnnotationCommand,
        undoLastAnnotationCommand
    };
}
