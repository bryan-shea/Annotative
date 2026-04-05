import * as vscode from 'vscode';
import { CommandContext } from './index';

export function registerLocalDiffReviewCommands(
    _context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { localDiffReviewService, planReviewPanel } = cmdContext;

    if (!localDiffReviewService || !planReviewPanel) {
        return {};
    }

    const reviewLocalDiffCommand = vscode.commands.registerCommand(
        'annotative.reviewLocalDiff',
        async () => {
            try {
                const artifact = await localDiffReviewService.createArtifactFromWorkspaceDiff();
                await planReviewPanel.showArtifact(artifact.id);
                vscode.window.showInformationMessage(`Local diff review created: ${artifact.title}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to review local diff: ${message}`);
            }
        }
    );

    return {
        reviewLocalDiffCommand,
    };
}