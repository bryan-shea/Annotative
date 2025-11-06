/**
 * Filter & View Commands
 * Handles: filter by status, filter by tag, search, clear filters, refresh, go to annotation
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationProvider } from '../ui';
import { Annotation } from '../types';
import { CommandContext } from './index';

export function registerFilterCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, annotationProvider } = cmdContext;

    // Command: Refresh annotations view
    const refreshCommand = vscode.commands.registerCommand(
        'annotative.refresh',
        () => {
            annotationProvider.refresh();
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                annotationManager.updateDecorations(activeEditor);
            }
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

    return {
        refreshCommand,
        filterByStatusCommand,
        filterByTagCommand,
        searchAnnotationsCommand,
        clearFiltersCommand,
        goToAnnotationCommand,
        toggleGroupByCommand
    };
}
