import * as vscode from 'vscode';
import { AnnotationManager } from './annotationManager';
import { AnnotationProvider, TreeItem, AnnotationItem } from './ui/annotationProvider';
import { AnnotationWebviewPanel } from './ui/annotationWebviewPanel';
import { AnnotationDashboard } from './ui/annotationDashboard';
import { CopilotExporter } from './copilotExporter';
import { Annotation } from './types';

let annotationManager: AnnotationManager;
let annotationProvider: AnnotationProvider;
let dashboard: AnnotationDashboard | undefined;

function refreshAllViews() {
    annotationProvider.refresh();
    if (dashboard) {
        dashboard.updateAnnotations(annotationManager.getAllAnnotations());
    }
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

    // Auto-open dashboard on activation if there are annotations
    // Users can disable this by closing the dashboard - it won't auto-open again in the same session
    const hasOpenedDashboard = context.workspaceState.get<boolean>('hasOpenedDashboard', false);
    const annotations = annotationManager.getAllAnnotations();

    if (!hasOpenedDashboard && annotations.length > 0) {
        // Open dashboard automatically if there are annotations
        vscode.commands.executeCommand('annotative.showDashboard');
        context.workspaceState.update('hasOpenedDashboard', true);
    }

    // Dashboard message handler
    function handleDashboardMessage(message: any) {
        switch (message.command) {
            case 'refresh':
                if (dashboard) {
                    dashboard.updateAnnotations(annotationManager.getAllAnnotations());
                }
                break;
            case 'goToAnnotation':
                const annotation = annotationManager.getAllAnnotations().find(a => a.id === message.id);
                if (annotation) {
                    vscode.commands.executeCommand('annotative.goToAnnotation', annotation);
                }
                break;
            case 'viewAnnotation':
                const viewAnnotation = annotationManager.getAllAnnotations().find(a => a.id === message.id);
                if (viewAnnotation) {
                    const item: AnnotationItem = {
                        annotation: viewAnnotation,
                        collapsibleState: vscode.TreeItemCollapsibleState.None
                    } as AnnotationItem;
                    vscode.commands.executeCommand('annotative.viewAnnotation', item);
                }
                break;
            case 'editAnnotation':
                const editAnnotation = annotationManager.getAllAnnotations().find(a => a.id === message.id);
                if (editAnnotation) {
                    const item: AnnotationItem = {
                        annotation: editAnnotation,
                        collapsibleState: vscode.TreeItemCollapsibleState.None
                    } as AnnotationItem;
                    vscode.commands.executeCommand('annotative.editAnnotation', item);
                }
                break;
            case 'toggleResolved':
                const toggleAnnotation = annotationManager.getAllAnnotations().find(a => a.id === message.id);
                if (toggleAnnotation) {
                    annotationManager.toggleResolvedStatus(toggleAnnotation.id, toggleAnnotation.filePath).then(() => {
                        annotationProvider.refresh();
                        if (dashboard) {
                            dashboard.updateAnnotations(annotationManager.getAllAnnotations());
                        }
                    });
                }
                break;
            case 'removeAnnotation':
                const removeAnnotation = annotationManager.getAllAnnotations().find(a => a.id === message.id);
                if (removeAnnotation) {
                    vscode.window.showWarningMessage(
                        'Are you sure you want to remove this annotation?',
                        'Yes', 'No'
                    ).then(confirmed => {
                        if (confirmed === 'Yes' && removeAnnotation) {
                            annotationManager.removeAnnotation(removeAnnotation.id, removeAnnotation.filePath).then(() => {
                                annotationProvider.refresh();
                                if (dashboard) {
                                    dashboard.updateAnnotations(annotationManager.getAllAnnotations());
                                }
                            });
                        }
                    });
                }
                break;
            case 'addAnnotation':
                vscode.commands.executeCommand('annotative.addAnnotation');
                break;
            case 'export':
                vscode.commands.executeCommand('annotative.exportAnnotations');
                break;
            case 'exportCopilot':
                vscode.commands.executeCommand('annotative.exportForCopilot');
                break;
            case 'exportSelected':
                if (message.selectedIds && message.selectedIds.length > 0) {
                    vscode.commands.executeCommand('annotative.exportSelectedForCopilot', message.selectedIds);
                } else {
                    vscode.window.showInformationMessage('No annotations selected');
                }
                break;
            case 'resolveAll':
                vscode.commands.executeCommand('annotative.resolveAll');
                break;
            case 'deleteResolved':
                vscode.commands.executeCommand('annotative.deleteResolved');
                break;
            case 'showShortcuts':
                vscode.window.showInformationMessage(
                    'Keyboard Shortcuts:\n' +
                    'Ctrl+Shift+A: Add annotation\n' +
                    'Ctrl+E: Export\n' +
                    'Alt+↑/↓: Navigate annotations\n' +
                    '?: Show shortcuts',
                    { modal: true }
                );
                break;
        }
    }

    // Command: Show Dashboard
    const showDashboardCommand = vscode.commands.registerCommand(
        'annotative.showDashboard',
        () => {
            dashboard = AnnotationDashboard.createOrShow(context.extensionUri, handleDashboardMessage);
            dashboard.updateAnnotations(annotationManager.getAllAnnotations());
        }
    );

    // Register commands

    // Command: Add annotation to selected text
    const addAnnotationCommand = vscode.commands.registerTextEditorCommand(
        'annotative.addAnnotation',
        async (editor: vscode.TextEditor) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showWarningMessage('Please select some text to annotate.');
                return;
            }

            const selectedText = editor.document.getText(selection);

            // Show the webview panel
            const annotationData = await AnnotationWebviewPanel.createOrShow(
                context.extensionUri,
                selectedText
            );

            if (annotationData) {
                await annotationManager.addAnnotation(
                    editor,
                    selection,
                    annotationData.comment,
                    annotationData.tags
                );
                refreshAllViews();
                vscode.window.showInformationMessage('Annotation added successfully!');
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
                { label: '📋 All Annotations', value: 'all' as const, description: currentFilter === 'all' ? '(current)' : '' },
                { label: '🔍 Unresolved Only', value: 'unresolved' as const, description: currentFilter === 'unresolved' ? '(current)' : '' },
                { label: '✅ Resolved Only', value: 'resolved' as const, description: currentFilter === 'resolved' ? '(current)' : '' }
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
                { label: '🏷️ All Tags', value: 'all' as const, description: currentTag === 'all' ? '(current)' : '' },
                ...allTags.map(tag => ({
                    label: `🏷️ ${tag}`,
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

            // Show the webview panel with existing data
            const annotationData = await AnnotationWebviewPanel.createOrShow(
                context.extensionUri,
                annotation.text,
                annotation.comment,
                annotation.tags,
                false // isReadOnly
            );

            if (annotationData) {
                await annotationManager.editAnnotation(
                    annotation.id,
                    annotation.filePath,
                    annotationData.comment,
                    annotationData.tags
                );
                refreshAllViews();
                vscode.window.showInformationMessage('Annotation updated successfully!');
            }
        }
    );

    // Command: View annotation (read-only)
    const viewAnnotationCommand = vscode.commands.registerCommand(
        'annotative.viewAnnotation',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Show the webview panel in read-only mode with location info
            await AnnotationWebviewPanel.createOrShow(
                context.extensionUri,
                annotation.text,
                annotation.comment,
                annotation.tags,
                true, // isReadOnly
                annotation.filePath,
                {
                    start: annotation.range.start.line,
                    end: annotation.range.end.line
                }
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
        showDashboardCommand,
        addAnnotationCommand,
        removeAnnotationCommand,
        toggleResolvedCommand,
        goToAnnotationCommand,
        exportAnnotationsCommand,
        exportForCopilotCommand,
        exportSelectedForCopilotCommand,
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
