import * as vscode from 'vscode';
import { AnnotationManager } from './annotationManager';
import { AnnotationProvider, TreeItem, AnnotationItem } from './ui/annotationProvider';
import { Annotation } from './types';

let annotationManager: AnnotationManager;
let annotationProvider: AnnotationProvider;

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

            const comment = await vscode.window.showInputBox({
                prompt: 'Enter your annotation comment',
                placeHolder: 'Type your comment here...'
            });

            if (comment) {
                await annotationManager.addAnnotation(editor, selection, comment);
                annotationProvider.refresh();
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
                annotationProvider.refresh();
                vscode.window.showInformationMessage('Annotation removed successfully!');
            }
        }
    );

    // Command: Toggle resolved status
    const toggleResolvedCommand = vscode.commands.registerCommand(
        'annotative.toggleResolved',
        async (item: AnnotationItem) => {
            await annotationManager.toggleResolvedStatus(item.annotation.id, item.annotation.filePath);
            annotationProvider.refresh();

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
            annotationProvider.refresh();
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
        removeAnnotationCommand,
        toggleResolvedCommand,
        goToAnnotationCommand,
        exportAnnotationsCommand,
        showExportCommand,
        refreshCommand,
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
