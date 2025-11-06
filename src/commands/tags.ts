/**
 * Tag Commands
 * Handles: add tag, remove tag, manage tags for annotations
 */

import * as vscode from 'vscode';
import { AnnotationItem } from '../ui';
import { CommandContext } from './index';

/**
 * Helper to convert Tag to string
 */
function tagToString(tag: any): string {
    return typeof tag === 'string' ? tag : tag.id;
}

export function registerTagCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, sidebarWebview } = cmdContext;

    // Command: Add tag to annotation
    const addTagCommand = vscode.commands.registerCommand(
        'annotative.addTag',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Get available tags
            const availableTags = [
                'bug', 'performance', 'security', 'style',
                'improvement', 'docs', 'question', 'ai-review'
            ];

            // Filter out tags already on the annotation
            const currentTags = annotation.tags?.map((t: any) => tagToString(t)) || [];
            const filteredTags = availableTags.filter(tag => !currentTags.includes(tag));

            if (filteredTags.length === 0) {
                vscode.window.showInformationMessage('All available tags are already added!');
                return;
            }

            // Let user select tag to add
            const selectedTag = await vscode.window.showQuickPick(filteredTags, {
                placeHolder: 'Select a tag to add'
            });

            if (!selectedTag) {
                return;
            }

            // Add the tag
            const updatedTags = [...currentTags, selectedTag];
            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                annotation.comment,
                updatedTags,
                annotation.color
            );

            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage(`Tag '${selectedTag}' added!`);
        }
    );

    // Command: Remove tag from annotation
    const removeTagCommand = vscode.commands.registerCommand(
        'annotative.removeTag',
        async (item: AnnotationItem, tagToRemove?: string) => {
            const annotation = item.annotation;

            // Get current tags
            const currentTags = annotation.tags?.map((t: any) => tagToString(t)) || [];

            if (currentTags.length === 0) {
                vscode.window.showInformationMessage('This annotation has no tags!');
                return;
            }

            // If tag not specified, let user select which tag to remove
            let selectedTag = tagToRemove;
            if (!selectedTag) {
                selectedTag = await vscode.window.showQuickPick(currentTags, {
                    placeHolder: 'Select a tag to remove'
                });
            }

            if (!selectedTag) {
                return;
            }

            // Remove the tag
            const updatedTags = currentTags.filter(tag => tag !== selectedTag);
            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                annotation.comment,
                updatedTags,
                annotation.color
            );

            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage(`Tag '${selectedTag}' removed!`);
        }
    );

    // Command: Manage tags for annotation (add/remove in one dialog)
    const manageTagsCommand = vscode.commands.registerCommand(
        'annotative.manageTags',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Get available tags
            const availableTags = [
                'bug', 'performance', 'security', 'style',
                'improvement', 'docs', 'question', 'ai-review'
            ];

            // Get current tags
            const currentTags = annotation.tags?.map((t: any) => tagToString(t)) || [];

            // Let user select tags (multi-select)
            const selectedTags = await vscode.window.showQuickPick(availableTags, {
                placeHolder: 'Select tags for this annotation',
                canPickMany: true,
                // Pre-select current tags
            });

            if (!selectedTags) {
                return;
            }

            // Update the annotation with new tags
            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                annotation.comment,
                selectedTags,
                annotation.color
            );

            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage('Tags updated!');
        }
    );

    // Command: Clear all tags from annotation
    const clearTagsCommand = vscode.commands.registerCommand(
        'annotative.clearTags',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            if (!annotation.tags || annotation.tags.length === 0) {
                vscode.window.showInformationMessage('This annotation has no tags!');
                return;
            }

            // Confirm action
            const confirm = await vscode.window.showWarningMessage(
                'Clear all tags from this annotation?',
                { modal: true },
                'Clear Tags'
            );

            if (confirm !== 'Clear Tags') {
                return;
            }

            // Clear all tags
            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                annotation.comment,
                [],
                annotation.color
            );

            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage('All tags cleared!');
        }
    );

    return {
        addTagCommand,
        removeTagCommand,
        manageTagsCommand,
        clearTagsCommand
    };
}
