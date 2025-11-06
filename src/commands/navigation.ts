/**
 * Navigation Commands
 * Handles: next annotation, previous annotation, resolve all, delete resolved, delete all
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationItem } from '../ui';
import { CommandContext } from './index';

export function registerNavigationCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, sidebarWebview } = cmdContext;

    /**
     * Navigate to next or previous annotation
     */
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

        let targetAnnotation;

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
                sidebarWebview.refreshAnnotations();
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
                sidebarWebview.refreshAnnotations();
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
                sidebarWebview.refreshAnnotations();
                vscode.window.showInformationMessage(`${count} annotation(s) deleted`);
            }
        }
    );

    return {
        nextAnnotationCommand,
        previousAnnotationCommand,
        resolveAllCommand,
        deleteResolvedCommand,
        deleteAllCommand
    };
}
