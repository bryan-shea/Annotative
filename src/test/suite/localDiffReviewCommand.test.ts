import * as assert from 'assert';
import * as vscode from 'vscode';
import { registerLocalDiffReviewCommands } from '../../commands';

type RegisteredCommandCallback = (...args: unknown[]) => Promise<void> | void;

suite('LocalDiffReviewCommands', () => {
    const originalRegisterCommand = vscode.commands.registerCommand;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const originalShowErrorMessage = vscode.window.showErrorMessage;

    teardown(() => {
        (vscode.commands as unknown as { registerCommand: typeof vscode.commands.registerCommand }).registerCommand = originalRegisterCommand;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage = originalShowInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage = originalShowErrorMessage;
    });

    test('creates a local diff review artifact from the shared command flow', async () => {
        const registered = new Map<string, RegisteredCommandCallback>();
        const calls = {
            createArtifactFromWorkspaceDiff: 0,
            showArtifact: [] as string[],
            infoMessages: [] as string[],
        };
        const localDiffReviewService = {
            createArtifactFromWorkspaceDiff: async () => {
                calls.createArtifactFromWorkspaceDiff += 1;
                return { id: 'local-diff-command', title: 'Review Local Diff: Annotative' };
            },
        };
        const planReviewPanel = {
            showArtifact: async (artifactId: string) => {
                calls.showArtifact.push(artifactId);
            },
        };

        (vscode.commands as unknown as { registerCommand: typeof vscode.commands.registerCommand }).registerCommand =
            ((command: string, callback: RegisteredCommandCallback) => {
                registered.set(command, callback);
                return new vscode.Disposable(() => {
                    registered.delete(command);
                });
            }) as typeof vscode.commands.registerCommand;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
            (async (message: string) => {
                calls.infoMessages.push(message);
                return undefined;
            }) as typeof vscode.window.showInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage =
            (async () => undefined) as typeof vscode.window.showErrorMessage;

        registerLocalDiffReviewCommands({} as vscode.ExtensionContext, {
            annotationManager: {} as never,
            sidebarWebview: {} as never,
            localDiffReviewService: localDiffReviewService as never,
            planReviewPanel: planReviewPanel as never,
            ANNOTATION_COLORS: [],
        });

        const command = registered.get('annotative.reviewLocalDiff');
        assert.ok(command, 'Expected annotative.reviewLocalDiff to be registered.');

        await command?.();

        assert.strictEqual(calls.createArtifactFromWorkspaceDiff, 1);
        assert.deepStrictEqual(calls.showArtifact, ['local-diff-command']);
        assert.deepStrictEqual(calls.infoMessages, ['Local diff review created: Review Local Diff: Annotative']);
    });
});