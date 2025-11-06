/**
 * Bulk Commands
 * Handles: bulk tag, bulk resolve, bulk delete, bulk color, select all, deselect all
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationProvider } from '../ui';
import { CommandContext } from './index';

/**
 * Helper to convert Tag to string
 */
function tagToString(tag: string | { id: string }): string {
    return typeof tag === 'string' ? tag : tag.id;
}

export function registerBulkCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, annotationProvider, sidebarWebview, ANNOTATION_COLORS } = cmdContext;

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
                    const updated = new Set((annotation.tags || []).map(t => tagToString(t)));
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
                sidebarWebview.refreshAnnotations();
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
                sidebarWebview.refreshAnnotations();
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
                sidebarWebview.refreshAnnotations();
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
                    const tagsStr = annotation.tags?.map(t => tagToString(t));
                    await annotationManager.editAnnotation(
                        annotation.id,
                        annotation.filePath,
                        annotation.comment,
                        tagsStr,
                        selectedColor.value
                    );
                }
                annotationProvider.deselectAllAnnotations();
                sidebarWebview.refreshAnnotations();
                vscode.window.showInformationMessage(`Changed color for ${selected.length} annotation(s)`);
            }
        }
    );

    // Command: Select all visible annotations
    const selectAllCommand = vscode.commands.registerCommand(
        'annotative.selectAll',
        () => {
            annotationProvider.selectAllAnnotations();
            const count = annotationProvider.getSelectedCount();
            vscode.window.showInformationMessage(`Selected ${count} annotation(s)`);
        }
    );

    // Command: Deselect all annotations
    const deselectAllCommand = vscode.commands.registerCommand(
        'annotative.deselectAll',
        () => {
            annotationProvider.deselectAllAnnotations();
            vscode.window.showInformationMessage('Deselected all annotations');
        }
    );

    return {
        bulkTagCommand,
        bulkResolveCommand,
        bulkDeleteCommand,
        bulkColorCommand,
        selectAllCommand,
        deselectAllCommand
    };
}
