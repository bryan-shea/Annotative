/**
 * Filter & View Commands
 * Handles: filter by status, filter by tag, search, clear filters, refresh, go to annotation
 */

import * as vscode from 'vscode';
import { Annotation } from '../types';
import { CommandContext } from './index';

export function registerFilterCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { annotationManager, sidebarWebview } = cmdContext;

    // Command: Refresh annotations view
    const refreshCommand = vscode.commands.registerCommand(
        'annotative.refresh',
        () => {
            sidebarWebview.refreshAnnotations();
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
            const currentFilter = sidebarWebview.getFilterState().status;
            const options = [
                { label: 'All Annotations', value: 'all' as const, description: currentFilter === 'all' ? '(current)' : '' },
                { label: 'Unresolved Only', value: 'unresolved' as const, description: currentFilter === 'unresolved' ? '(current)' : '' },
                { label: 'Resolved Only', value: 'resolved' as const, description: currentFilter === 'resolved' ? '(current)' : '' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select filter'
            });

            if (selected) {
                sidebarWebview.setFilterState({ status: selected.value });
                vscode.window.showInformationMessage(`Filter: ${selected.label}`);
            }
        }
    );

    // Command: Filter by tag
    const filterByTagCommand = vscode.commands.registerCommand(
        'annotative.filterByTag',
        async () => {
            const allTags = annotationManager.getAllTags();
            const currentTag = sidebarWebview.getFilterState().tag;

            const options = [
                { label: 'All Tags', value: 'all' as const, description: currentTag === 'all' ? '(current)' : '' },
                ...allTags.map(tag => ({
                    label: annotationManager.resolveTagLabel(tag),
                    value: tag,
                    description: currentTag === tag ? '(current)' : ''
                }))
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select tag to filter'
            });

            if (selected) {
                sidebarWebview.setFilterState({ tag: selected.value });
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
                value: sidebarWebview.getFilterState().search
            });

            if (query !== undefined) {
                sidebarWebview.setFilterState({ search: query.trim() });
                if (query) {
                    vscode.window.showInformationMessage(`Search: "${query}"`);
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
            sidebarWebview.clearFilters();
            vscode.window.showInformationMessage('Filters cleared');
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
                vscode.window.showErrorMessage(`Cannot open: ${annotation.filePath}`);
            }
        }
    );

    // Command: Toggle group-by view (file/tag/status)
    const toggleGroupByCommand = vscode.commands.registerCommand(
        'annotative.toggleGroupBy',
        async () => {
            const currentGroupBy = sidebarWebview.getFilterState().groupBy;
            const options = [
                { label: 'By File', value: 'file' as const, description: currentGroupBy === 'file' ? '(current)' : '' },
                { label: 'By Tag', value: 'tag' as const, description: currentGroupBy === 'tag' ? '(current)' : '' },
                { label: 'By Status', value: 'status' as const, description: currentGroupBy === 'status' ? '(current)' : '' },
                { label: 'By Folder', value: 'folder' as const, description: currentGroupBy === 'folder' ? '(current)' : '' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Group by'
            });

            if (selected) {
                sidebarWebview.setFilterState({ groupBy: selected.value });
                vscode.window.showInformationMessage(`Grouped ${selected.label.toLowerCase()}`);
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