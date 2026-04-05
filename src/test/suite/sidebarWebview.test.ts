import * as assert from 'assert';
import * as vscode from 'vscode';
import { AnnotationTagOption } from '../../types';
import { SidebarWebview } from '../../ui/sidebarWebview';
import { createAnnotation, getWorkspaceRoot } from './testUtils';

class FakeWebview {
    public html = '';
    public options: vscode.WebviewOptions | undefined;
    public readonly cspSource = 'vscode-webview://test';
    public readonly postedMessages: Array<{ command: string; [key: string]: unknown }> = [];
    private messageHandler: ((message: unknown) => Promise<void> | void) | undefined;

    asWebviewUri(uri: vscode.Uri): vscode.Uri {
        return uri;
    }

    onDidReceiveMessage(handler: (message: unknown) => Promise<void> | void): vscode.Disposable {
        this.messageHandler = handler;
        return new vscode.Disposable(() => {
            this.messageHandler = undefined;
        });
    }

    async postMessage(message: { command: string; [key: string]: unknown }): Promise<boolean> {
        this.postedMessages.push(message);
        return true;
    }

    async dispatch(message: { command: string; [key: string]: unknown }): Promise<void> {
        await this.messageHandler?.(message);
    }
}

class FakeWebviewView {
    public visible = true;

    constructor(public readonly webview: FakeWebview) {}

    onDidChangeVisibility(_listener: () => void): vscode.Disposable {
        return new vscode.Disposable(() => undefined);
    }
}

suite('SidebarWebview', () => {
    const originalExecuteCommand = vscode.commands.executeCommand;

    teardown(() => {
        (vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }).executeCommand = originalExecuteCommand;
    });

    test('loads initial annotations, tags, and filter state into the webview', () => {
        const filePath = `${getWorkspaceRoot()}\\sample.ts`;
        const annotation = createAnnotation({ filePath, id: 'sidebar-initial' });
        const tags: AnnotationTagOption[] = [{ id: 'bug-tag', label: 'Bug', priority: 'high' }];
        const annotationManager = {
            getAllAnnotations: () => [annotation],
            getTagOptions: () => tags,
        };
        const sidebar = new SidebarWebview(vscode.Uri.file(getWorkspaceRoot()), annotationManager as never);
        const webview = new FakeWebview();

        sidebar.resolveWebviewView(
            new FakeWebviewView(webview) as unknown as vscode.WebviewView,
            {} as vscode.WebviewViewResolveContext,
            {} as vscode.CancellationToken
        );

        assert.strictEqual(webview.postedMessages.length, 3);
        assert.deepStrictEqual(webview.postedMessages.map(message => message.command), [
            'updateAnnotations',
            'tagsUpdated',
            'filterStateUpdated',
        ]);
        assert.ok(webview.html.includes('sidebar-webview.js'));
        assert.ok(webview.html.includes('workflow-select'));
        assert.ok(webview.html.includes('btn-run-workflow'));
        assert.ok(webview.html.includes('filter-search'));
        assert.ok(webview.html.includes('btn-reset-filters'));
    });

    test('routes critical sidebar messages to the annotation manager and tracks filters', async () => {
        const filePath = `${getWorkspaceRoot()}\\sidebar-actions.ts`;
        const annotation = createAnnotation({
            filePath,
            id: 'sidebar-actions',
            tags: ['bug-tag'],
            comment: 'Original sidebar comment.',
        });
        const calls = {
            toggles: [] as Array<{ id: string; filePath: string }>,
            removals: [] as Array<{ id: string; filePath: string }>,
            edits: [] as Array<{ id: string; filePath: string; comment: string; tags: string[]; color?: string }>,
            resolveAll: 0,
            deleteResolved: 0,
        };
        const annotationManager = {
            getAllAnnotations: () => [annotation],
            getTagOptions: () => [{ id: 'bug-tag', label: 'Bug' }],
            toggleResolvedStatus: async (id: string, targetFilePath: string) => {
                calls.toggles.push({ id, filePath: targetFilePath });
                annotation.resolved = !annotation.resolved;
            },
            removeAnnotation: async (id: string, targetFilePath: string) => {
                calls.removals.push({ id, filePath: targetFilePath });
            },
            editAnnotation: async (
                id: string,
                targetFilePath: string,
                comment: string,
                tags: string[],
                color?: string
            ) => {
                calls.edits.push({ id, filePath: targetFilePath, comment, tags, color });
                annotation.comment = comment;
                annotation.tags = [...tags];
                annotation.color = color;
            },
            resolveAll: async () => {
                calls.resolveAll += 1;
                return 1;
            },
            deleteResolved: async () => {
                calls.deleteResolved += 1;
                return 1;
            },
        };
        const sidebar = new SidebarWebview(vscode.Uri.file(getWorkspaceRoot()), annotationManager as never);
        const webview = new FakeWebview();

        sidebar.resolveWebviewView(
            new FakeWebviewView(webview) as unknown as vscode.WebviewView,
            {} as vscode.WebviewViewResolveContext,
            {} as vscode.CancellationToken
        );

        await webview.dispatch({
            command: 'filterStateChanged',
            filters: { status: 'resolved', tag: 'bug-tag', search: 'sidebar' },
        });
        assert.deepStrictEqual(sidebar.getFilterState(), {
            status: 'resolved',
            tag: 'bug-tag',
            search: 'sidebar',
            groupBy: 'file',
        });

        await webview.dispatch({ command: 'toggleResolved', id: 'sidebar-actions' });
        await webview.dispatch({ command: 'addTag', id: 'sidebar-actions', tag: 'docs-tag' });
        await webview.dispatch({ command: 'removeTag', id: 'sidebar-actions', tag: 'bug-tag' });
        await webview.dispatch({ command: 'manageTags', id: 'sidebar-actions', tags: ['docs-tag', 'security-tag'] });
        await webview.dispatch({ command: 'resolveAll' });
        await webview.dispatch({ command: 'deleteResolved' });
        await webview.dispatch({ command: 'delete', id: 'sidebar-actions' });

        assert.deepStrictEqual(calls.toggles, [{ id: 'sidebar-actions', filePath }]);
        assert.deepStrictEqual(calls.removals, [{ id: 'sidebar-actions', filePath }]);
        assert.strictEqual(calls.edits.length, 3);
        assert.deepStrictEqual(calls.edits[0].tags, ['bug-tag', 'docs-tag']);
        assert.deepStrictEqual(calls.edits[1].tags, ['docs-tag']);
        assert.deepStrictEqual(calls.edits[2].tags, ['docs-tag', 'security-tag']);
        assert.strictEqual(calls.resolveAll, 1);
        assert.strictEqual(calls.deleteResolved, 1);
    });

    test('maps sidebar workflow actions to shipped commands', async () => {
        const executedCommands: string[] = [];
        const annotationManager = {
            getAllAnnotations: () => [],
            getTagOptions: () => [],
        };
        const sidebar = new SidebarWebview(vscode.Uri.file(getWorkspaceRoot()), annotationManager as never);
        const webview = new FakeWebview();

        (vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }).executeCommand =
            (async (command: string) => {
                executedCommands.push(command);
            }) as typeof vscode.commands.executeCommand;

        sidebar.resolveWebviewView(
            new FakeWebviewView(webview) as unknown as vscode.WebviewView,
            {} as vscode.WebviewViewResolveContext,
            {} as vscode.CancellationToken
        );

        await webview.dispatch({ command: 'sidebarAction', action: 'reviewMarkdownPlan' });
        await webview.dispatch({ command: 'sidebarAction', action: 'reviewLastAIResponse' });
        await webview.dispatch({ command: 'sidebarAction', action: 'reviewLocalDiff' });
        await webview.dispatch({ command: 'sidebarAction', action: 'exportForAI' });
        await webview.dispatch({ command: 'sidebarAction', action: 'showAnnotativeCommands' });

        assert.deepStrictEqual(executedCommands, [
            'annotative.reviewMarkdownPlan',
            'annotative.reviewLastAIResponse',
            'annotative.reviewLocalDiff',
            'annotative.exportForAI',
            'workbench.action.showCommands',
        ]);
    });
});