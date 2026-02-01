/**
 * Sidebar Commands
 * Handles: show sidebar, toggle sidebar, project storage initialization
 */

import * as vscode from 'vscode';
import { CommandContext } from './index';

export function registerSidebarCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { sidebarWebview, annotationManager } = cmdContext;

    // Command: Show sidebar (opens/focuses webview panel)
    const showSidebarCommand = vscode.commands.registerCommand(
        'annotative.showSidebar',
        () => {
            sidebarWebview.show();
        }
    );

    // Command: Toggle sidebar visibility
    const toggleSidebarCommand = vscode.commands.registerCommand(
        'annotative.toggleSidebar',
        () => {
            sidebarWebview.toggle();
        }
    );

    // Command: Initialize project-based storage
    const initProjectStorageCommand = vscode.commands.registerCommand(
        'annotative.initProjectStorage',
        async () => {
            // Check if already initialized
            if (annotationManager.isProjectStorageActive()) {
                vscode.window.showInformationMessage('Project storage already active.');
                return;
            }

            // Ask about migration
            const migrateChoice = await vscode.window.showQuickPick([
                { label: 'Create new storage', description: 'Start fresh', value: false },
                { label: 'Migrate existing', description: 'Copy current annotations', value: true }
            ], {
                placeHolder: 'Initialize .annotative folder'
            });

            if (!migrateChoice) {
                return;
            }

            try {
                const created = await annotationManager.initializeProjectStorage(migrateChoice.value);

                if (created) {
                    vscode.window.showInformationMessage(
                        migrateChoice.value
                            ? 'Project storage initialized with existing data.'
                            : 'Project storage initialized.'
                    );
                } else {
                    vscode.window.showInformationMessage('Switched to project storage.');
                }

                sidebarWebview.refreshAnnotations();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to initialize: ${error}`);
            }
        }
    );

    // Command: Show storage info
    const showStorageInfoCommand = vscode.commands.registerCommand(
        'annotative.showStorageInfo',
        async () => {
            const isProjectStorage = annotationManager.isProjectStorageActive();
            const storageDir = annotationManager.getStorageDirectory();

            const message = isProjectStorage
                ? `Project storage: ${storageDir}`
                : 'No project storage (annotations saved on first use)';

            const action = await vscode.window.showInformationMessage(
                message,
                isProjectStorage ? 'Open Folder' : 'Initialize'
            );

            if (action === 'Open Folder') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(storageDir));
            } else if (action === 'Initialize') {
                await vscode.commands.executeCommand('annotative.initProjectStorage');
            }
        }
    );

    return {
        showSidebarCommand,
        toggleSidebarCommand,
        initProjectStorageCommand,
        showStorageInfoCommand
    };
}
