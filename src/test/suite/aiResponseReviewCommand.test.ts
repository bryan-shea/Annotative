import * as assert from 'assert';
import * as vscode from 'vscode';
import { registerAiResponseReviewCommands } from '../../commands';
import { aiResponseReviewCommandDependencies } from '../../commands/aiResponseReview';
import { getWorkspaceRoot, readReviewArtifactFixture } from './testUtils';

type RegisteredCommandCallback = (...args: unknown[]) => Promise<void> | void;

suite('AIResponseReviewCommands', () => {
    const originalRegisterCommand = vscode.commands.registerCommand;
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const originalShowErrorMessage = vscode.window.showErrorMessage;
    const originalShowOpenDialog = vscode.window.showOpenDialog;
    const originalShowTextDocument = vscode.window.showTextDocument;
    const originalOpenTextDocument = vscode.workspace.openTextDocument;
    const originalClipboardReadText = aiResponseReviewCommandDependencies.readClipboardText;

    teardown(() => {
        (vscode.commands as unknown as { registerCommand: typeof vscode.commands.registerCommand }).registerCommand = originalRegisterCommand;
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick = originalShowQuickPick;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage = originalShowInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage = originalShowErrorMessage;
        (vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog }).showOpenDialog = originalShowOpenDialog;
        (vscode.window as unknown as { showTextDocument: typeof vscode.window.showTextDocument }).showTextDocument = originalShowTextDocument;
        (vscode.workspace as unknown as { openTextDocument: typeof vscode.workspace.openTextDocument }).openTextDocument = originalOpenTextDocument;
        aiResponseReviewCommandDependencies.readClipboardText = originalClipboardReadText;
    });

    test('creates an AI response review artifact from clipboard text', async () => {
        const registered = new Map<string, RegisteredCommandCallback>();
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const calls = {
            createArtifactFromResponse: [] as Array<{ rawText: string; source: { type: string; metadata?: Record<string, unknown> } }>,
            showArtifact: [] as string[],
            infoMessages: [] as string[],
        };
        const aiResponseReviewService = {
            createArtifactFromResponse: async (input: { rawText: string; source: { type: string; metadata?: Record<string, unknown> } }) => {
                calls.createArtifactFromResponse.push(input);
                return { id: 'clipboard-ai-response', title: 'Clipboard Response' };
            },
            createManualPasteSource: (metadata: Record<string, unknown>) => ({
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
                metadata,
            }),
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
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
            (async () => ({
                label: 'Use Clipboard',
                description: 'Create a review artifact from the current clipboard contents',
                mode: 'clipboard',
            })) as unknown as typeof vscode.window.showQuickPick;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
            (async (message: string) => {
                calls.infoMessages.push(message);
                return undefined;
            }) as typeof vscode.window.showInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage =
            (async () => undefined) as typeof vscode.window.showErrorMessage;
        aiResponseReviewCommandDependencies.readClipboardText = async () => aiResponseText;

        registerAiResponseReviewCommands({} as vscode.ExtensionContext, {
            annotationManager: {} as never,
            sidebarWebview: {} as never,
            aiResponseReviewService: aiResponseReviewService as never,
            planReviewPanel: planReviewPanel as never,
            ANNOTATION_COLORS: [],
        });

        const command = registered.get('annotative.reviewLastAIResponse');
        assert.ok(command, 'Expected annotative.reviewLastAIResponse to be registered.');

        await command?.();

        assert.strictEqual(calls.createArtifactFromResponse.length, 1);
        assert.strictEqual(calls.createArtifactFromResponse[0].rawText, aiResponseText.trim());
        assert.strictEqual(calls.createArtifactFromResponse[0].source.type, 'manualPaste');
        assert.strictEqual(calls.createArtifactFromResponse[0].source.metadata?.sourceMode, 'clipboard');
        assert.deepStrictEqual(calls.showArtifact, ['clipboard-ai-response']);
        assert.deepStrictEqual(calls.infoMessages, ['AI response review created: Clipboard Response']);
    });

    test('creates an AI response review artifact from an untitled paste buffer', async () => {
        const registered = new Map<string, RegisteredCommandCallback>();
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const calls = {
            createArtifactFromResponse: [] as Array<{ rawText: string; source: { type: string; uri?: string; metadata?: Record<string, unknown> } }>,
            showArtifact: [] as string[],
        };
        const document = {
            uri: vscode.Uri.parse('untitled:Last AI Response'),
            fileName: 'Last AI Response',
            languageId: 'markdown',
            getText: () => aiResponseText,
        } as unknown as vscode.TextDocument;
        const editor = {
            document,
        } as unknown as vscode.TextEditor;
        const aiResponseReviewService = {
            createArtifactFromResponse: async (input: { rawText: string; source: { type: string; uri?: string; metadata?: Record<string, unknown> } }) => {
                calls.createArtifactFromResponse.push(input);
                return { id: 'manual-ai-response', title: 'Manual Response' };
            },
            createManualPasteSource: (metadata: Record<string, unknown>, uri?: string) => ({
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
                metadata,
                uri,
            }),
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
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
            (async () => ({
                label: 'Paste Into New Buffer',
                description: 'Open an untitled editor, paste the AI response, then create a review artifact',
                mode: 'manualPaste',
            })) as unknown as typeof vscode.window.showQuickPick;
        (vscode.workspace as unknown as { openTextDocument: typeof vscode.workspace.openTextDocument }).openTextDocument =
            (async () => document) as typeof vscode.workspace.openTextDocument;
        (vscode.window as unknown as { showTextDocument: typeof vscode.window.showTextDocument }).showTextDocument =
            (async () => editor) as typeof vscode.window.showTextDocument;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
            (async (message: string) => {
                if (message.startsWith('Paste the AI response into the untitled document')) {
                    return 'Create Review';
                }

                return undefined;
            }) as typeof vscode.window.showInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage =
            (async () => undefined) as typeof vscode.window.showErrorMessage;

        registerAiResponseReviewCommands({} as vscode.ExtensionContext, {
            annotationManager: {} as never,
            sidebarWebview: {} as never,
            aiResponseReviewService: aiResponseReviewService as never,
            planReviewPanel: planReviewPanel as never,
            ANNOTATION_COLORS: [],
        });

        const command = registered.get('annotative.reviewLastAIResponse');
        assert.ok(command, 'Expected annotative.reviewLastAIResponse to be registered.');

        await command?.();

        assert.strictEqual(calls.createArtifactFromResponse.length, 1);
        assert.strictEqual(calls.createArtifactFromResponse[0].source.type, 'manualPaste');
        assert.strictEqual(calls.createArtifactFromResponse[0].source.uri, 'untitled:Last%20AI%20Response');
        assert.strictEqual(calls.createArtifactFromResponse[0].source.metadata?.sourceMode, 'untitledBuffer');
        assert.strictEqual(calls.createArtifactFromResponse[0].source.metadata?.languageId, 'markdown');
        assert.deepStrictEqual(calls.showArtifact, ['manual-ai-response']);
    });

    test('creates an AI response review artifact from an imported file', async () => {
        const registered = new Map<string, RegisteredCommandCallback>();
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const calls = {
            createArtifactFromResponse: [] as Array<{ rawText: string; source: { type: string; metadata?: Record<string, unknown> } }>,
            showArtifact: [] as string[],
        };
        const selectedUri = vscode.Uri.file(`${getWorkspaceRoot()}\\responses\\last-response.md`);
        const document = {
            uri: selectedUri,
            fileName: selectedUri.fsPath,
            languageId: 'markdown',
            getText: () => aiResponseText,
        } as unknown as vscode.TextDocument;
        const aiResponseReviewService = {
            createArtifactFromResponse: async (input: { rawText: string; source: { type: string; metadata?: Record<string, unknown> } }) => {
                calls.createArtifactFromResponse.push(input);
                return { id: 'imported-ai-response', title: 'Imported Response' };
            },
            createSourceFromDocument: (sourceDocument: vscode.TextDocument, metadata: Record<string, unknown>) => ({
                type: 'chatResponse',
                uri: sourceDocument.uri.toString(),
                workspaceFolder: getWorkspaceRoot(),
                metadata: {
                    fileName: 'last-response.md',
                    languageId: sourceDocument.languageId,
                    ...metadata,
                },
            }),
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
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
            (async () => ({
                label: 'Import Text Or Markdown File',
                description: 'Create a review artifact from a saved response file',
                mode: 'importedFile',
            })) as unknown as typeof vscode.window.showQuickPick;
        (vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog }).showOpenDialog =
            (async () => [selectedUri]) as typeof vscode.window.showOpenDialog;
        (vscode.workspace as unknown as { openTextDocument: typeof vscode.workspace.openTextDocument }).openTextDocument =
            (async () => document) as typeof vscode.workspace.openTextDocument;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
            (async () => undefined) as typeof vscode.window.showInformationMessage;
        (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage =
            (async () => undefined) as typeof vscode.window.showErrorMessage;

        registerAiResponseReviewCommands({} as vscode.ExtensionContext, {
            annotationManager: {} as never,
            sidebarWebview: {} as never,
            aiResponseReviewService: aiResponseReviewService as never,
            planReviewPanel: planReviewPanel as never,
            ANNOTATION_COLORS: [],
        });

        const command = registered.get('annotative.reviewLastAIResponse');
        assert.ok(command, 'Expected annotative.reviewLastAIResponse to be registered.');

        await command?.();

        assert.strictEqual(calls.createArtifactFromResponse.length, 1);
        assert.strictEqual(calls.createArtifactFromResponse[0].source.type, 'chatResponse');
        assert.strictEqual(calls.createArtifactFromResponse[0].source.metadata?.sourceMode, 'importedFile');
        assert.deepStrictEqual(calls.showArtifact, ['imported-ai-response']);
    });
});