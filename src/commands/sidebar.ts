/**
 * Sidebar Commands
 * Handles: show sidebar, toggle sidebar
 */

import * as vscode from 'vscode';
import { CommandContext } from './index';

export function registerSidebarCommands(
    context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { sidebarWebview } = cmdContext;

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

    return {
        showSidebarCommand,
        toggleSidebarCommand
    };
}
