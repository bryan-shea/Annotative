import * as vscode from 'vscode';
import { AnnotationManager } from './annotationManager';
import { AnnotationProvider, TreeItem, AnnotationItem } from './ui/annotationProvider';
import { CopilotExporter } from './copilotExporter';
import { registerChatParticipant, registerChatVariableIfAvailable } from './copilotChatParticipant';
import { Annotation } from './types';

let annotationManager: AnnotationManager;
let annotationProvider: AnnotationProvider;

// Predefined color palette for annotations - user's visual preference only
const ANNOTATION_COLORS = [
    { label: '🟡 Yellow', value: '#ffc107' },
    { label: '🔴 Red', value: '#f44336' },
    { label: '🟠 Orange', value: '#ff9800' },
    { label: '🔵 Blue', value: '#2196f3' },
    { label: '🟢 Green', value: '#4caf50' },
    { label: '🟣 Purple', value: '#9c27b0' },
    { label: '🟤 Brown', value: '#795548' },
    { label: '⚪ Gray', value: '#9e9e9e' }
];

function refreshAllViews() {
    annotationProvider.refresh();
}

function navigateToNextAnnotation(manager: AnnotationManager, direction: 1 | -1): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const annotations = manager.getAnnotationsForFile(filePath);

    if (annotations.length === 0) {
        vscode.window.showInformationMessage('No annotations in this file');
        return;
    }

    const currentLine = editor.selection.active.line;
    const sortedAnnotations = annotations.sort((a, b) => a.range.start.line - b.range.start.line);

    let targetAnnotation: Annotation | undefined;

    if (direction === 1) {
        // Next annotation
        targetAnnotation = sortedAnnotations.find(a => a.range.start.line > currentLine);
        if (!targetAnnotation) {
            targetAnnotation = sortedAnnotations[0]; // Wrap to first
        }
    } else {
        // Previous annotation
        const reversed = [...sortedAnnotations].reverse();
        targetAnnotation = reversed.find(a => a.range.start.line < currentLine);
        if (!targetAnnotation) {
            targetAnnotation = sortedAnnotations[sortedAnnotations.length - 1]; // Wrap to last
        }
    }

    if (targetAnnotation) {
        editor.revealRange(targetAnnotation.range, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(targetAnnotation.range.start, targetAnnotation.range.end);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Annotative extension is now active!');

    // Initialize annotation manager
    annotationManager = new AnnotationManager(context);

    // Initialize annotation provider for the sidebar
    annotationProvider = new AnnotationProvider(annotationManager);
    const treeView = vscode.window.createTreeView('annotativeView', {
        treeDataProvider: annotationProvider,
        showCollapseAll: true
    });

    // Register Copilot Chat Participant (@annotative)
    const chatParticipant = registerChatParticipant(context, annotationManager);
    context.subscriptions.push(chatParticipant);

    // Register Chat Variable (#annotations) if available
    const chatVariable = registerChatVariableIfAvailable(context, annotationManager);
    if (chatVariable) {
        context.subscriptions.push(chatVariable);
    }

    // Command: Add annotation to selected text
    const addAnnotationCommand = vscode.commands.registerTextEditorCommand(
        'annotative.addAnnotation',
        async (editor: vscode.TextEditor) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showWarningMessage('Please select some text to annotate.');
                return;
            }

            // Get comment via input box
            const comment = await vscode.window.showInputBox({
                prompt: 'Enter annotation comment',
                placeHolder: 'What do you want to note about this code?',
                validateInput: (value) => {
                    return value.trim().length === 0 ? 'Comment cannot be empty' : null;
                }
            });

            if (!comment) {
                return;
            }

            // Get tags via quick pick (multi-select)
            const availableTags = [
                'bug', 'performance', 'security', 'style',
                'improvement', 'docs', 'question', 'ai-review'
            ];

            const selectedTags = await vscode.window.showQuickPick(availableTags, {
                placeHolder: 'Select tags (optional)',
                canPickMany: true
            });

            // Get color via quick pick
            const selectedColor = await vscode.window.showQuickPick(ANNOTATION_COLORS, {
                placeHolder: 'Choose a color (visual preference only)'
            });

            const color = selectedColor?.value || '#ffc107'; // Default to yellow

            await annotationManager.addAnnotation(
                editor,
                selection,
                comment,
                selectedTags || [],
                color
            );
            refreshAllViews();
            vscode.window.showInformationMessage('Annotation added successfully!');
        }
    );

    // Command: Add annotation from template
    const addAnnotationFromTemplateCommand = vscode.commands.registerTextEditorCommand(
        'annotative.addAnnotationFromTemplate',
        async (editor: vscode.TextEditor) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showWarningMessage('Please select some text to annotate.');
                return;
            }

            // Show template picker
            const template = await vscode.window.showQuickPick([
                {
                    label: 'Review AI-Generated Code',
                    comment: 'Review this AI-generated code for correctness and best practices',
                    tags: ['ai-review', 'review'],
                    detail: 'For code generated by Copilot, ChatGPT, or other AI tools'
                },
                {
                    label: 'Explain This Code',
                    comment: 'Explain how this code works and what it does',
                    tags: ['question', 'docs'],
                    detail: 'Ask for explanation of complex code sections'
                },
                {
                    label: 'Optimize This Code',
                    comment: 'Suggest optimizations for better performance',
                    tags: ['performance', 'optimization'],
                    detail: 'Identify performance improvements'
                },
                {
                    label: 'Find Potential Bugs',
                    comment: 'Review this code for potential bugs and edge cases',
                    tags: ['bug', 'review'],
                    detail: 'Look for logical errors and edge cases'
                },
                {
                    label: 'Security Review',
                    comment: 'Check this code for security vulnerabilities',
                    tags: ['security', 'review'],
                    detail: 'Identify security risks and vulnerabilities'
                },
                {
                    label: 'Generate Documentation',
                    comment: 'Generate documentation for this code',
                    tags: ['docs', 'documentation'],
                    detail: 'Create comprehensive code documentation'
                },
                {
                    label: 'Refactor Suggestion',
                    comment: 'Suggest refactoring to improve code quality',
                    tags: ['refactor', 'style'],
                    detail: 'Improve code structure and readability'
                },
                {
                    label: 'Add Tests',
                    comment: 'Suggest unit tests for this code',
                    tags: ['test', 'improvement'],
                    detail: 'Generate test cases and coverage'
                }
            ], {
                placeHolder: 'Select an annotation template',
                matchOnDetail: true
            });

            if (!template) {
                return;
            }

            // Add annotation with template
            await annotationManager.addAnnotation(
                editor,
                selection,
                template.comment,
                template.tags
            );
            refreshAllViews();

            // Ask if user wants to send to Copilot immediately
            const action = await vscode.window.showInformationMessage(
                `Annotation added: ${template.label}`,
                'Ask Copilot Now',
                'Done'
            );

            if (action === 'Ask Copilot Now') {
                const annotations = annotationManager.getAnnotationsForFile(editor.document.uri.fsPath);
                const newAnnotation = annotations[annotations.length - 1]; // Get the just-added annotation

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
                        vscode.window.showInformationMessage('Context copied! Open Copilot Chat and paste.');
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
                `Are you sure you want to remove this annotation?`,
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                await annotationManager.removeAnnotation(item.annotation.id, item.annotation.filePath);
                refreshAllViews();
                vscode.window.showInformationMessage('Annotation removed successfully!');
            }
        }
    );

    // Command: Toggle resolved status
    const toggleResolvedCommand = vscode.commands.registerCommand(
        'annotative.toggleResolved',
        async (item: AnnotationItem) => {
            await annotationManager.toggleResolvedStatus(item.annotation.id, item.annotation.filePath);
            refreshAllViews();

            const status = item.annotation.resolved ? 'unresolved' : 'resolved';
            vscode.window.showInformationMessage(`Annotation marked as ${status}!`);
        }
    );

    // Command: Go to annotation
    const goToAnnotationCommand = vscode.commands.registerCommand(
        'annotative.goToAnnotation',
        async (annotation: Annotation) => {
            try {
                const document = await vscode.workspace.openTextDocument(vscode.Uri.file(annotation.filePath));
                const editor = await vscode.window.showTextDocument(document);

                // Reveal and select the annotated range
                editor.revealRange(annotation.range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(annotation.range.start, annotation.range.end);
            } catch (error) {
                vscode.window.showErrorMessage(`Could not open file: ${annotation.filePath}`);
            }
        }
    );

    // Command: Export annotations to clipboard
    const exportAnnotationsCommand = vscode.commands.registerCommand(
        'annotative.exportAnnotations',
        async () => {
            try {
                const markdown = await annotationManager.exportToMarkdown();
                await vscode.env.clipboard.writeText(markdown);
                vscode.window.showInformationMessage('Annotations exported to clipboard as Markdown!');
            } catch (error) {
                vscode.window.showErrorMessage('Failed to export annotations.');
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
                vscode.window.showErrorMessage('Failed to show export.');
            }
        }
    );

    // Command: Refresh annotations view
    const refreshCommand = vscode.commands.registerCommand(
        'annotative.refresh',
        () => {
            refreshAllViews();
        }
    );

    // Command: Filter by status
    const filterByStatusCommand = vscode.commands.registerCommand(
        'annotative.filterByStatus',
        async () => {
            const currentFilter = annotationProvider.getFilterStatus();
            const options = [
                { label: 'All Annotations', value: 'all' as const, description: currentFilter === 'all' ? '(current)' : '' },
                { label: 'Unresolved Only', value: 'unresolved' as const, description: currentFilter === 'unresolved' ? '(current)' : '' },
                { label: 'Resolved Only', value: 'resolved' as const, description: currentFilter === 'resolved' ? '(current)' : '' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select filter'
            });

            if (selected) {
                annotationProvider.setFilterStatus(selected.value);
                vscode.window.showInformationMessage(`Filter: ${selected.label}`);
            }
        }
    );

    // Command: Filter by tag
    const filterByTagCommand = vscode.commands.registerCommand(
        'annotative.filterByTag',
        async () => {
            const allTags = annotationManager.getAllTags();
            const currentTag = annotationProvider.getFilterTag();

            const options = [
                { label: 'All Tags', value: 'all' as const, description: currentTag === 'all' ? '(current)' : '' },
                ...allTags.map(tag => ({
                    label: tag,
                    value: tag,
                    description: currentTag === tag ? '(current)' : ''
                }))
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select tag to filter'
            });

            if (selected) {
                annotationProvider.setFilterTag(selected.value);
                vscode.window.showInformationMessage(`Filter by tag: ${selected.label}`);
            }
        }
    );

    // Command: Search annotations
    const searchAnnotationsCommand = vscode.commands.registerCommand(
        'annotative.searchAnnotations',
        async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Search annotations by comment, code, author, or tag',
                placeHolder: 'Enter search query...',
                value: annotationProvider.getSearchQuery()
            });

            if (query !== undefined) {
                annotationProvider.setSearchQuery(query);
                if (query) {
                    vscode.window.showInformationMessage(`Searching for: "${query}"`);
                } else {
                    vscode.window.showInformationMessage('Search cleared');
                }
            }
        }
    );

    // Command: Clear all filters
    const clearFiltersCommand = vscode.commands.registerCommand(
        'annotative.clearFilters',
        () => {
            annotationProvider.clearFilters();
            vscode.window.showInformationMessage('All filters cleared');
        }
    );

    // Command: Edit annotation
    const editAnnotationCommand = vscode.commands.registerCommand(
        'annotative.editAnnotation',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Get updated comment via input box
            const comment = await vscode.window.showInputBox({
                prompt: 'Edit annotation comment',
                value: annotation.comment,
                validateInput: (value) => {
                    return value.trim().length === 0 ? 'Comment cannot be empty' : null;
                }
            });

            if (!comment) {
                return;
            }

            // Get updated color via quick pick
            const currentColor = ANNOTATION_COLORS.find(c => c.value === annotation.color);
            const selectedColor = await vscode.window.showQuickPick(ANNOTATION_COLORS, {
                placeHolder: 'Select a color for this annotation'
            });

            const color = selectedColor?.value || annotation.color || '#ffc107';

            // Get updated tags via quick pick (multi-select)
            const availableTags = [
                'bug', 'performance', 'security', 'style',
                'improvement', 'docs', 'question', 'ai-review'
            ];

            const selectedTags = await vscode.window.showQuickPick(availableTags, {
                placeHolder: 'Select tags (optional)',
                canPickMany: true,
                // Pre-select existing tags
            });

            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                comment,
                selectedTags !== undefined ? selectedTags : annotation.tags,
                color
            );
            refreshAllViews();
            vscode.window.showInformationMessage('Annotation updated successfully!');
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
            const tagsStr = annotation.tags && annotation.tags.length > 0 ? annotation.tags.join(', ') : 'none';
            const resolvedStr = annotation.resolved ? '✓ Resolved' : '○ Unresolved';

            vscode.window.showInformationMessage(
                `${resolvedStr}\nTags: ${tagsStr}\nComment: ${annotation.comment}`,
                { modal: false }
            );
        }
    );

    // Command: Undo last annotation
    const undoLastAnnotationCommand = vscode.commands.registerCommand(
        'annotative.undoLastAnnotation',
        () => {
            const undoneAnnotation = annotationManager.undoLastAnnotation();
            if (undoneAnnotation) {
                refreshAllViews();
                vscode.window.showInformationMessage('Last annotation removed');
            } else {
                vscode.window.showWarningMessage('No annotation to undo');
            }
        }
    );

    // Command: Resolve all annotations
    const resolveAllCommand = vscode.commands.registerCommand(
        'annotative.resolveAll',
        async (item?: AnnotationItem) => {
            const filePath = item instanceof AnnotationItem ? item.annotation.filePath : undefined;
            const scope = filePath ? 'in this file' : 'in all files';

            const confirmed = await vscode.window.showWarningMessage(
                `Mark all annotations ${scope} as resolved?`,
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                const count = await annotationManager.resolveAll(filePath);
                refreshAllViews();
                vscode.window.showInformationMessage(`${count} annotation(s) marked as resolved`);
            }
        }
    );

    // Command: Delete resolved annotations
    const deleteResolvedCommand = vscode.commands.registerCommand(
        'annotative.deleteResolved',
        async (item?: AnnotationItem) => {
            const filePath = item instanceof AnnotationItem ? item.annotation.filePath : undefined;
            const scope = filePath ? 'in this file' : 'in all files';

            const confirmed = await vscode.window.showWarningMessage(
                `Delete all resolved annotations ${scope}?`,
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                const count = await annotationManager.deleteResolved(filePath);
                refreshAllViews();
                vscode.window.showInformationMessage(`${count} resolved annotation(s) deleted`);
            }
        }
    );

    // Command: Delete all annotations
    const deleteAllCommand = vscode.commands.registerCommand(
        'annotative.deleteAll',
        async () => {
            const confirmed = await vscode.window.showWarningMessage(
                'Delete ALL annotations? This cannot be undone!',
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                const count = await annotationManager.deleteAll();
                refreshAllViews();
                vscode.window.showInformationMessage(`${count} annotation(s) deleted`);
            }
        }
    );

    // Command: Next annotation
    const nextAnnotationCommand = vscode.commands.registerCommand(
        'annotative.nextAnnotation',
        () => {
            navigateToNextAnnotation(annotationManager, 1);
        }
    );

    // Command: Previous annotation
    const previousAnnotationCommand = vscode.commands.registerCommand(
        'annotative.previousAnnotation',
        () => {
            navigateToNextAnnotation(annotationManager, -1);
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
                `Exported ${annotations.length} annotation(s) to clipboard! Paste into GitHub Copilot Chat.`,
                'Save to Workspace',
                'View Output'
            );

            if (action === 'Save to Workspace') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    await CopilotExporter.exportToWorkspace(annotations, workspaceRoot);
                    vscode.window.showInformationMessage('Saved to .copilot/annotations folder');
                } else {
                    vscode.window.showWarningMessage('No workspace folder found');
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
                `Exported ${selectedAnnotations.length} selected annotation(s) to clipboard! Paste into GitHub Copilot Chat.`,
                'Save to Workspace',
                'View Output'
            );

            if (action === 'Save to Workspace') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    await CopilotExporter.exportToWorkspace(selectedAnnotations, workspaceRoot);
                    vscode.window.showInformationMessage('Saved to .copilot/annotations folder');
                } else {
                    vscode.window.showWarningMessage('No workspace folder found');
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

    // ========== NEW COPILOT INTEGRATION COMMANDS ==========

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
                        'Annotation context copied! Paste into Copilot Chat (Ctrl+V)',
                        'Got it'
                    );
                } catch (err) {
                    vscode.window.showInformationMessage(
                        'Annotation context copied to clipboard. Open Copilot Chat and paste.',
                        'Open Chat'
                    ).then(action => {
                        if (action === 'Open Chat') {
                            vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                        }
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to format annotation: ${error}`);
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

                vscode.window.showInformationMessage(
                    'Copied to clipboard! Paste into any AI chat.',
                    'Got it'
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to copy context: ${error}`);
            }
        }
    );

    // Command: Export by Intent (Filter for specific purposes)
    const exportByIntentCommand = vscode.commands.registerCommand(
        'annotative.exportByIntent',
        async () => {
            const intent = await vscode.window.showQuickPick([
                { label: 'Code Review', value: 'review', description: 'All unresolved annotations' },
                { label: 'Bug Fixes', value: 'bugs', description: 'Bug and security issues only' },
                { label: 'Optimization', value: 'optimization', description: 'Performance improvements' },
                { label: 'Documentation', value: 'documentation', description: 'Documentation needs' }
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
                `Exported ${intent.label} annotations to clipboard!`,
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
                    vscode.window.showInformationMessage('Saved to .copilot/annotations folder');
                }
            }
        }
    );

    // Command: Export for Different AI Tools
    const exportForAICommand = vscode.commands.registerCommand(
        'annotative.exportForAI',
        async () => {
            const format = await vscode.window.showQuickPick([
                { label: 'GitHub Copilot', value: 'copilot', description: 'Conversational format' },
                { label: 'ChatGPT', value: 'chatgpt', description: 'Markdown with system prompt' },
                { label: 'Claude', value: 'claude', description: 'XML-structured format' },
                { label: 'Generic', value: 'generic', description: 'Universal format' }
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
                placeHolder: 'Include resolved annotations?'
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
                `Exported ${annotations.length} annotations for ${format.label}!`,
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
                vscode.window.showInformationMessage('No unresolved annotations to review!');
                return;
            }

            const maxToReview = 10; // Limit to prevent overwhelming
            const toReview = unresolved.slice(0, maxToReview);

            const proceed = await vscode.window.showInformationMessage(
                `Review ${toReview.length} annotation(s) with AI? This will generate prompts for each one.`,
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
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
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
                    `Batch review ready! Report copied to clipboard.`,
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
                        vscode.window.showInformationMessage('Please open Copilot Chat and paste the report.');
                    }
                } else if (action === 'Save to File') {
                    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (workspaceRoot) {
                        await CopilotExporter.exportToWorkspace(toReview, workspaceRoot, 'batch-review');
                        vscode.window.showInformationMessage('Saved to .copilot/annotations/batch-review');
                    }
                }
            });
        }
    );

    // Command: Toggle group-by view (file/tag/status)
    const toggleGroupByCommand = vscode.commands.registerCommand(
        'annotative.toggleGroupBy',
        async () => {
            const options = [
                { label: 'Group by File', value: 'file' as const },
                { label: 'Group by Tag', value: 'tag' as const },
                { label: 'Group by Status', value: 'status' as const }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Choose view organization'
            });

            if (selected) {
                annotationProvider.setGroupBy(selected.value);
                vscode.window.showInformationMessage(`Now grouping by ${selected.label.split(' ')[2]}`);
            }
        }
    );

    // Command: Bulk tag annotations
    const bulkTagCommand = vscode.commands.registerCommand(
        'annotative.bulkTag',
        async () => {
            const selected = annotationProvider.getSelectedAnnotations();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select annotations first');
                return;
            }

            const availableTags = [
                'bug', 'performance', 'security', 'style',
                'improvement', 'docs', 'question', 'ai-review'
            ];

            const newTags = await vscode.window.showQuickPick(availableTags, {
                placeHolder: `Add tags to ${selected.length} selected annotation(s)`,
                canPickMany: true
            });

            if (newTags && newTags.length > 0) {
                for (const annotation of selected) {
                    const updated = new Set(annotation.tags || []);
                    newTags.forEach(tag => updated.add(tag));
                    await annotationManager.editAnnotation(
                        annotation.id,
                        annotation.filePath,
                        annotation.comment,
                        Array.from(updated),
                        annotation.color
                    );
                }
                annotationProvider.deselectAllAnnotations();
                refreshAllViews();
                vscode.window.showInformationMessage(`Tagged ${selected.length} annotation(s)`);
            }
        }
    );

    // Command: Bulk resolve annotations
    const bulkResolveCommand = vscode.commands.registerCommand(
        'annotative.bulkResolve',
        async () => {
            const selected = annotationProvider.getSelectedAnnotations();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select annotations first');
                return;
            }

            const confirmed = await vscode.window.showWarningMessage(
                `Mark ${selected.length} selected annotation(s) as resolved?`,
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                for (const annotation of selected) {
                    await annotationManager.toggleResolvedStatus(annotation.id, annotation.filePath);
                }
                annotationProvider.deselectAllAnnotations();
                refreshAllViews();
                vscode.window.showInformationMessage(`Resolved ${selected.length} annotation(s)`);
            }
        }
    );

    // Command: Bulk delete annotations
    const bulkDeleteCommand = vscode.commands.registerCommand(
        'annotative.bulkDelete',
        async () => {
            const selected = annotationProvider.getSelectedAnnotations();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select annotations first');
                return;
            }

            const confirmed = await vscode.window.showWarningMessage(
                `Delete ${selected.length} selected annotation(s)? This cannot be undone.`,
                'Yes', 'No'
            );

            if (confirmed === 'Yes') {
                for (const annotation of selected) {
                    await annotationManager.removeAnnotation(annotation.id, annotation.filePath);
                }
                annotationProvider.deselectAllAnnotations();
                refreshAllViews();
                vscode.window.showInformationMessage(`Deleted ${selected.length} annotation(s)`);
            }
        }
    );

    // Command: Bulk change color
    const bulkColorCommand = vscode.commands.registerCommand(
        'annotative.bulkColor',
        async () => {
            const selected = annotationProvider.getSelectedAnnotations();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select annotations first');
                return;
            }

            const selectedColor = await vscode.window.showQuickPick(ANNOTATION_COLORS, {
                placeHolder: `Change color for ${selected.length} selected annotation(s)`
            });

            if (selectedColor) {
                for (const annotation of selected) {
                    await annotationManager.editAnnotation(
                        annotation.id,
                        annotation.filePath,
                        annotation.comment,
                        annotation.tags,
                        selectedColor.value
                    );
                }
                annotationProvider.deselectAllAnnotations();
                refreshAllViews();
                vscode.window.showInformationMessage(`Changed color for ${selected.length} annotation(s)`);
            }
        }
    );

    // Command: Select all visible annotations
    const selectAllCommand = vscode.commands.registerCommand(
        'annotative.selectAll',
        () => {
            annotationProvider.selectAllAnnotations();
            refreshAllViews();
            const count = annotationProvider.getSelectedCount();
            vscode.window.showInformationMessage(`Selected ${count} annotation(s)`);
        }
    );

    // Command: Deselect all annotations
    const deselectAllCommand = vscode.commands.registerCommand(
        'annotative.deselectAll',
        () => {
            annotationProvider.deselectAllAnnotations();
            refreshAllViews();
            vscode.window.showInformationMessage('Deselected all annotations');
        }
    );

    // Listen for active editor changes to update decorations
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            annotationManager.updateDecorations(editor);
        }
    });

    // Update decorations for the current editor on startup
    if (vscode.window.activeTextEditor) {
        annotationManager.updateDecorations(vscode.window.activeTextEditor);
    }

    // Register all disposables
    context.subscriptions.push(
        addAnnotationCommand,
        addAnnotationFromTemplateCommand,
        removeAnnotationCommand,
        toggleResolvedCommand,
        goToAnnotationCommand,
        exportAnnotationsCommand,
        exportForCopilotCommand,
        exportSelectedForCopilotCommand,
        askCopilotAboutAnnotationCommand,
        copyAsCopilotContextCommand,
        exportByIntentCommand,
        exportForAICommand,
        batchAIReviewCommand,
        showExportCommand,
        refreshCommand,
        filterByStatusCommand,
        filterByTagCommand,
        searchAnnotationsCommand,
        clearFiltersCommand,
        editAnnotationCommand,
        viewAnnotationCommand,
        undoLastAnnotationCommand,
        resolveAllCommand,
        deleteResolvedCommand,
        deleteAllCommand,
        nextAnnotationCommand,
        previousAnnotationCommand,
        toggleGroupByCommand,
        bulkTagCommand,
        bulkResolveCommand,
        bulkDeleteCommand,
        bulkColorCommand,
        selectAllCommand,
        deselectAllCommand,
        onDidChangeActiveTextEditor,
        treeView,
        annotationManager
    );
}

export function deactivate() {
    if (annotationManager) {
        annotationManager.dispose();
    }
}
