import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanReviewPanel } from '../../ui';
import { createReviewArtifact, getWorkspaceRoot } from './testUtils';

class FakeWebview {
    public html = '';
    public readonly cspSource = 'vscode-webview://test';
    public readonly postedMessages: Array<{ command: string; [key: string]: unknown }> = [];
    private handler: ((message: unknown) => Promise<void> | void) | undefined;

    asWebviewUri(uri: vscode.Uri): vscode.Uri {
        return uri;
    }

    onDidReceiveMessage(handler: (message: unknown) => Promise<void> | void): vscode.Disposable {
        this.handler = handler;
        return new vscode.Disposable(() => {
            this.handler = undefined;
        });
    }

    async postMessage(message: { command: string; [key: string]: unknown }): Promise<boolean> {
        this.postedMessages.push(message);
        return true;
    }

    async dispatch(message: { command: string; [key: string]: unknown }): Promise<void> {
        await this.handler?.(message);
    }
}

class FakePanel {
    public title = '';
    public iconPath: vscode.Uri | undefined;
    public readonly webview = new FakeWebview();
    private disposeListener: (() => void) | undefined;

    reveal(): void {
        return;
    }

    onDidDispose(listener: () => void): vscode.Disposable {
        this.disposeListener = listener;
        return new vscode.Disposable(() => {
            this.disposeListener = undefined;
        });
    }

    dispose(): void {
        this.disposeListener?.();
    }
}

suite('PlanReviewPanel', () => {
    const originalCreateWebviewPanel = vscode.window.createWebviewPanel;
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalShowInputBox = vscode.window.showInputBox;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const originalShowWarningMessage = vscode.window.showWarningMessage;
    const originalOpenTextDocument = vscode.workspace.openTextDocument;
    const originalShowTextDocument = vscode.window.showTextDocument;

    teardown(() => {
        (vscode.window as unknown as { createWebviewPanel: typeof vscode.window.createWebviewPanel }).createWebviewPanel = originalCreateWebviewPanel;
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick = originalShowQuickPick;
        (vscode.window as unknown as { showInputBox: typeof vscode.window.showInputBox }).showInputBox = originalShowInputBox;
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage = originalShowInformationMessage;
        (vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }).showWarningMessage = originalShowWarningMessage;
        (vscode.workspace as unknown as { openTextDocument: typeof vscode.workspace.openTextDocument }).openTextDocument = originalOpenTextDocument;
        (vscode.window as unknown as { showTextDocument: typeof vscode.window.showTextDocument }).showTextDocument = originalShowTextDocument;
    });

    test('renders a plan review artifact and routes export actions through the manager', async () => {
        const panelInstance = new FakePanel();
        const artifact = createReviewArtifact({
            id: 'plan-panel',
            title: 'Panel Review Plan',
            source: {
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
            },
            content: {
                rawText: '# Panel Review Plan',
                sections: [
                    {
                        id: 'goal',
                        heading: 'Goal',
                        level: 2,
                        order: 1,
                        content: 'Ship the panel flow.',
                        lineStart: 3,
                        lineEnd: 4,
                    },
                ],
                blocks: [
                    {
                        id: 'goal-block-1',
                        sectionId: 'goal',
                        kind: 'paragraph',
                        order: 1,
                        content: 'Ship the panel flow.',
                        lineStart: 4,
                        lineEnd: 4,
                    },
                ],
            },
            annotations: [],
        });
        const calls = {
            exportArtifact: [] as Array<{ artifactId: string; adapterId?: string }>,
            recordExport: [] as Array<{ artifactId: string; adapterId: string; target: string }>,
        };
        const reviewArtifactManager = {
            getArtifact: async () => artifact,
            getSupportedExportAdapters: () => [
                {
                    id: 'genericMarkdown',
                    label: 'Generic Markdown',
                    description: 'Readable markdown export for human review and archival.',
                },
                {
                    id: 'copilotReviewPrompt',
                    label: 'Copilot Review Prompt',
                    description: 'Structured follow-up export for Copilot-style coding agents.',
                },
            ],
            exportArtifact: async (exportArtifact: { id: string }, adapterId?: string) => {
                calls.exportArtifact.push({ artifactId: exportArtifact.id, adapterId });
                return {
                    adapterId: adapterId ?? 'genericMarkdown',
                    content: '# Exported Plan Review',
                    language: 'markdown' as const,
                    fileExtension: 'md',
                };
            },
            recordExport: async (artifactId: string, input: { adapterId: string; target?: string }) => {
                calls.recordExport.push({ artifactId, adapterId: input.adapterId, target: input.target ?? '' });
                return artifact;
            },
        };

        (vscode.window as unknown as { createWebviewPanel: typeof vscode.window.createWebviewPanel }).createWebviewPanel =
            (() => panelInstance as unknown as vscode.WebviewPanel);
        (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
            (async () => undefined) as typeof vscode.window.showInformationMessage;
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
            (async () => ({
                label: 'Copilot Review Prompt',
                description: 'Structured follow-up export for Copilot-style coding agents.',
                adapter: {
                    id: 'copilotReviewPrompt',
                    label: 'Copilot Review Prompt',
                    description: 'Structured follow-up export for Copilot-style coding agents.',
                },
            })) as unknown as typeof vscode.window.showQuickPick;
        (vscode.workspace as unknown as { openTextDocument: typeof vscode.workspace.openTextDocument }).openTextDocument =
            (async () => ({
                uri: vscode.Uri.file(`${getWorkspaceRoot()}\\export.md`),
                fileName: `${getWorkspaceRoot()}\\export.md`,
                languageId: 'markdown',
                getText: () => '# Exported Plan Review',
                lineAt: () => ({ range: { end: { character: 0 } } }),
                lineCount: 1,
            } as unknown as vscode.TextDocument)) as typeof vscode.workspace.openTextDocument;
        (vscode.window as unknown as { showTextDocument: typeof vscode.window.showTextDocument }).showTextDocument =
            (async () => ({
                selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                revealRange: () => undefined,
            } as unknown as vscode.TextEditor)) as typeof vscode.window.showTextDocument;

        const panel = new PlanReviewPanel(vscode.Uri.file(getWorkspaceRoot()), reviewArtifactManager as never);

        await panel.showArtifact('plan-panel');
        await panelInstance.webview.dispatch({ command: 'exportArtifact', exportTarget: 'document' });

        assert.strictEqual(panelInstance.title, 'Plan Review: Panel Review Plan');
        assert.ok(panelInstance.webview.html.includes('plan-review-webview.js'));
        assert.deepStrictEqual(calls.exportArtifact, [{ artifactId: 'plan-panel', adapterId: 'copilotReviewPrompt' }]);
        assert.deepStrictEqual(calls.recordExport, [{ artifactId: 'plan-panel', adapterId: 'copilotReviewPrompt', target: 'document' }]);
        assert.deepStrictEqual(panelInstance.webview.postedMessages.map(message => message.command), ['updateArtifact']);

        panel.dispose();
    });

    test('routes add-annotation panel actions through review artifact prompts', async () => {
        const panelInstance = new FakePanel();
        const artifact = createReviewArtifact({
            id: 'plan-panel-annotation',
            title: 'Panel Annotation Plan',
            annotations: [],
            content: {
                rawText: '# Panel Annotation Plan',
                sections: [
                    {
                        id: 'steps',
                        heading: 'Steps',
                        level: 2,
                        order: 1,
                        content: '1. Add command wiring.',
                        lineStart: 3,
                        lineEnd: 4,
                    },
                ],
                blocks: [
                    {
                        id: 'steps-block-1',
                        sectionId: 'steps',
                        kind: 'list',
                        order: 1,
                        content: '1. Add command wiring.',
                        lineStart: 4,
                        lineEnd: 4,
                    },
                ],
            },
        });
        const quickPickResults: Array<Record<string, unknown>> = [
            { label: 'Request Change', description: 'Call out a required change' },
            { label: 'High', value: 'high' },
        ];
        const inputResults = ['Tighten the sequence before implementation.'];
        const calls = {
            addAnnotation: [] as Array<{ artifactId: string; targetType: string; blockId?: string; severity?: string }>,
        };
        const reviewArtifactManager = {
            getArtifact: async () => artifact,
            addAnnotation: async (artifactId: string, input: { target: { type: string; blockId?: string }; severity?: string }) => {
                calls.addAnnotation.push({
                    artifactId,
                    targetType: input.target.type,
                    blockId: input.target.blockId,
                    severity: input.severity,
                });
                return artifact;
            },
        };

        quickPickResults[0] = {
            label: 'Request Change',
            description: 'Call out a required change',
            option: {
                id: 'request_change',
                label: 'Request Change',
                description: 'Call out a required change',
                kind: 'requestChange',
            },
        };

        (vscode.window as unknown as { createWebviewPanel: typeof vscode.window.createWebviewPanel }).createWebviewPanel =
            (() => panelInstance as unknown as vscode.WebviewPanel);
        (vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
            (async () => quickPickResults.shift()) as typeof vscode.window.showQuickPick;
        (vscode.window as unknown as { showInputBox: typeof vscode.window.showInputBox }).showInputBox =
            (async () => inputResults.shift()) as typeof vscode.window.showInputBox;

        const panel = new PlanReviewPanel(vscode.Uri.file(getWorkspaceRoot()), reviewArtifactManager as never);

        await panel.showArtifact('plan-panel-annotation');
        await panelInstance.webview.dispatch({
            command: 'addAnnotation',
            targetType: 'block',
            sectionId: 'steps',
            blockId: 'steps-block-1',
            lineStart: 4,
            lineEnd: 4,
        });

        assert.deepStrictEqual(calls.addAnnotation, [{
            artifactId: 'plan-panel-annotation',
            targetType: 'block',
            blockId: 'steps-block-1',
            severity: 'high',
        }]);

        panel.dispose();
    });
});