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
function tagToString(tag: string | { id: string }): string {
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

            // Get available custom tags
            const customTags = annotationManager.getCustomTags();

            if (customTags.length === 0) {
                const create = await vscode.window.showInformationMessage(
                    'No tags defined. Create one?',
                    'Create Tag', 'Cancel'
                );
                if (create === 'Create Tag') {
                    await vscode.commands.executeCommand('annotative.createCustomTag');
                }
                return;
            }

            // Filter out tags already on the annotation
            const currentTags = annotation.tags?.map((t) => tagToString(t)) || [];
            const availableTags = customTags.filter(tag => !currentTags.includes(tag.id));

            if (availableTags.length === 0) {
                vscode.window.showInformationMessage('All tags already applied.');
                return;
            }

            // Let user select tag to add
            const tagOptions = availableTags.map(t => ({
                label: t.name,
                value: t.id
            }));

            const selectedTag = await vscode.window.showQuickPick(tagOptions, {
                placeHolder: 'Select a tag'
            });

            if (!selectedTag) {
                return;
            }

            // Add the tag
            const updatedTags = [...currentTags, selectedTag.value];
            await annotationManager.editAnnotation(
                annotation.id,
                annotation.filePath,
                annotation.comment,
                updatedTags,
                annotation.color
            );

            sidebarWebview.refreshAnnotations();
            vscode.window.showInformationMessage(`Tag added: ${selectedTag.label}`);
        }
    );

    // Command: Remove tag from annotation
    const removeTagCommand = vscode.commands.registerCommand(
        'annotative.removeTag',
        async (item: AnnotationItem, tagToRemove?: string) => {
            const annotation = item.annotation;

            // Get current tags
            const currentTags = annotation.tags?.map((t) => tagToString(t)) || [];

            if (currentTags.length === 0) {
                vscode.window.showInformationMessage('No tags to remove.');
                return;
            }

            // If tag not specified, let user select which tag to remove
            let selectedTag = tagToRemove;
            if (!selectedTag) {
                selectedTag = await vscode.window.showQuickPick(currentTags, {
                    placeHolder: 'Select tag to remove'
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
            vscode.window.showInformationMessage(`Tag removed: ${selectedTag}`);
        }
    );

    // Command: Manage tags for annotation (add/remove in one dialog)
    const manageTagsCommand = vscode.commands.registerCommand(
        'annotative.manageTags',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            // Get available custom tags
            const customTags = annotationManager.getCustomTags();

            if (customTags.length === 0) {
                const create = await vscode.window.showInformationMessage(
                    'No tags defined. Create one?',
                    'Create Tag', 'Cancel'
                );
                if (create === 'Create Tag') {
                    await vscode.commands.executeCommand('annotative.createCustomTag');
                }
                return;
            }

            const tagOptions = customTags.map(t => t.name);

            // Let user select tags (multi-select)
            const selectedTags = await vscode.window.showQuickPick(tagOptions, {
                placeHolder: 'Select tags',
                canPickMany: true
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
            vscode.window.showInformationMessage('Tags updated.');
        }
    );

    // Command: Clear all tags from annotation
    const clearTagsCommand = vscode.commands.registerCommand(
        'annotative.clearTags',
        async (item: AnnotationItem) => {
            const annotation = item.annotation;

            if (!annotation.tags || annotation.tags.length === 0) {
                vscode.window.showInformationMessage('No tags to clear.');
                return;
            }

            // Confirm action
            const confirm = await vscode.window.showWarningMessage(
                'Clear all tags?',
                { modal: true },
                'Clear'
            );

            if (confirm !== 'Clear') {
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
            vscode.window.showInformationMessage('Tags cleared.');
        }
    );

    // Command: Create a custom tag
    const createCustomTagCommand = vscode.commands.registerCommand(
        'annotative.createCustomTag',
        async () => {
            // Get tag name
            const tagName = await vscode.window.showInputBox({
                prompt: 'Tag name',
                placeHolder: 'e.g., needs-review',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Name required';
                    }
                    if (value.length > 30) {
                        return 'Max 30 characters';
                    }
                    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                        return 'Letters, numbers, hyphens, underscores only';
                    }
                    return null;
                }
            });

            if (!tagName) {
                return;
            }

            // Get category
            const categoryOptions = [
                { label: 'Issue', value: 'issue' as const, description: 'Bugs, errors' },
                { label: 'Action', value: 'action' as const, description: 'Todo, refactor' },
                { label: 'Reference', value: 'reference' as const, description: 'Docs, notes' },
                { label: 'Meta', value: 'meta' as const, description: 'Info, warnings' },
                { label: 'Custom', value: 'custom' as const, description: 'Other' }
            ];

            const selectedCategory = await vscode.window.showQuickPick(categoryOptions, {
                placeHolder: 'Category'
            });

            if (!selectedCategory) {
                return;
            }

            // Get priority
            const priorityOptions = [
                { label: 'Low', value: 'low' as const },
                { label: 'Medium', value: 'medium' as const },
                { label: 'High', value: 'high' as const },
                { label: 'Critical', value: 'critical' as const }
            ];

            const selectedPriority = await vscode.window.showQuickPick(priorityOptions, {
                placeHolder: 'Priority'
            });

            if (!selectedPriority) {
                return;
            }

            // Get color
            const colorOptions = [
                { label: 'Red', value: '#FF5252' },
                { label: 'Orange', value: '#FFA726' },
                { label: 'Yellow', value: '#FFEE58' },
                { label: 'Green', value: '#66BB6A' },
                { label: 'Blue', value: '#42A5F5' },
                { label: 'Purple', value: '#AB47BC' },
                { label: 'Cyan', value: '#26C6DA' },
                { label: 'Gray', value: '#78909C' }
            ];

            const selectedColor = await vscode.window.showQuickPick(colorOptions, {
                placeHolder: 'Color'
            });

            if (!selectedColor) {
                return;
            }

            try {
                await annotationManager.createCustomTag(
                    tagName.toLowerCase(),
                    selectedCategory.value,
                    {
                        priority: selectedPriority.value,
                        color: selectedColor.value,
                        description: tagName
                    }
                );

                sidebarWebview.refreshAnnotations();
                vscode.window.showInformationMessage(`Tag created: ${tagName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create tag: ${error}`);
            }
        }
    );

    // Command: Delete a custom tag
    const deleteCustomTagCommand = vscode.commands.registerCommand(
        'annotative.deleteCustomTag',
        async () => {
            const customTags = annotationManager.getCustomTags();

            if (customTags.length === 0) {
                vscode.window.showInformationMessage('No tags to delete.');
                return;
            }

            const tagOptions = customTags.map(tag => ({
                label: tag.name,
                description: tag.category,
                value: tag.id
            }));

            const selectedTag = await vscode.window.showQuickPick(tagOptions, {
                placeHolder: 'Select tag to delete'
            });

            if (!selectedTag) {
                return;
            }

            // Confirm deletion
            const confirm = await vscode.window.showWarningMessage(
                `Delete tag "${selectedTag.label}"?`,
                { modal: true },
                'Delete'
            );

            if (confirm !== 'Delete') {
                return;
            }

            try {
                const deleted = await annotationManager.deleteCustomTag(selectedTag.value);
                if (deleted) {
                    sidebarWebview.refreshAnnotations();
                    vscode.window.showInformationMessage(`Deleted: ${selectedTag.label}`);
                } else {
                    vscode.window.showErrorMessage('Failed to delete tag');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    // Command: Edit a custom tag
    const editCustomTagCommand = vscode.commands.registerCommand(
        'annotative.editCustomTag',
        async () => {
            const customTags = annotationManager.getCustomTags();

            if (customTags.length === 0) {
                vscode.window.showInformationMessage('No tags to edit.');
                return;
            }

            const tagOptions = customTags.map(tag => ({
                label: tag.name,
                description: `${tag.category} - ${tag.metadata?.priority || 'medium'}`,
                value: tag.id
            }));

            const selectedTag = await vscode.window.showQuickPick(tagOptions, {
                placeHolder: 'Select tag to edit'
            });

            if (!selectedTag) {
                return;
            }

            // Get new name
            const newName = await vscode.window.showInputBox({
                prompt: 'New name (leave empty to keep current)',
                placeHolder: selectedTag.label,
                validateInput: (value) => {
                    if (value && value.length > 30) {
                        return 'Max 30 characters';
                    }
                    if (value && !/^[a-zA-Z0-9-_]*$/.test(value)) {
                        return 'Letters, numbers, hyphens, underscores only';
                    }
                    return null;
                }
            });

            if (newName === undefined) {
                return; // User cancelled
            }

            // Get new color
            const colorOptions = [
                { label: 'Keep current', value: '' },
                { label: 'Red', value: '#FF5252' },
                { label: 'Orange', value: '#FFA726' },
                { label: 'Yellow', value: '#FFEE58' },
                { label: 'Green', value: '#66BB6A' },
                { label: 'Blue', value: '#42A5F5' },
                { label: 'Purple', value: '#AB47BC' },
                { label: 'Cyan', value: '#26C6DA' },
                { label: 'Gray', value: '#78909C' }
            ];

            const selectedColor = await vscode.window.showQuickPick(colorOptions, {
                placeHolder: 'Select new color'
            });

            if (!selectedColor) {
                return;
            }

            try {
                const metadata = selectedColor.value ? { color: selectedColor.value } : undefined;
                const updatedTag = await annotationManager.updateCustomTag(
                    selectedTag.value,
                    newName || undefined,
                    metadata
                );

                if (updatedTag) {
                    sidebarWebview.refreshAnnotations();
                    vscode.window.showInformationMessage(`Updated: ${selectedTag.label}`);
                } else {
                    vscode.window.showErrorMessage('Failed to update tag');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    // Command: List all tags
    const listTagsCommand = vscode.commands.registerCommand(
        'annotative.listTags',
        async () => {
            const customTags = annotationManager.getCustomTags();

            if (customTags.length === 0) {
                const createNew = await vscode.window.showInformationMessage(
                    'No tags defined. Create one?',
                    'Create Tag'
                );
                if (createNew === 'Create Tag') {
                    vscode.commands.executeCommand('annotative.createCustomTag');
                }
                return;
            }

            const allTags = customTags.map(tag => ({
                label: `$(tag) ${tag.name}`,
                description: tag.category,
                detail: tag.metadata?.description
            }));

            await vscode.window.showQuickPick(allTags, {
                placeHolder: 'Available tags',
                matchOnDescription: true,
                matchOnDetail: true
            });
        }
    );

    return {
        addTagCommand,
        removeTagCommand,
        manageTagsCommand,
        clearTagsCommand,
        createCustomTagCommand,
        deleteCustomTagCommand,
        editCustomTagCommand,
        listTagsCommand
    };
}
