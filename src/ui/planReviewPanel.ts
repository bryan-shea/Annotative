import * as path from 'path';
import * as vscode from 'vscode';
import { ReviewAnnotation, ReviewAnnotationKind, ReviewAnnotationTarget, ReviewArtifact, ReviewArtifactKind } from '../types';
import { ReviewArtifactManager, type ReviewArtifactExportAdapter } from '../managers';

type ExportTarget = 'clipboard' | 'document';

interface PlanReviewPanelMessage {
    command: 'refresh' | 'openSource' | 'addAnnotation' | 'editAnnotation' | 'toggleAnnotationStatus' | 'deleteAnnotation' | 'exportArtifact';
    annotationId?: string;
    exportTarget?: ExportTarget;
    targetType?: ReviewAnnotationTarget['type'];
    sectionId?: string;
    blockId?: string;
    diffFileId?: string;
    diffHunkId?: string;
    lineStart?: number;
    lineEnd?: number;
    sourcePath?: string;
    sourceBasePath?: string;
}

interface AnnotationCategoryOption {
    id: string;
    label: string;
    description: string;
    kind: ReviewAnnotationKind;
}

const ANNOTATION_CATEGORY_OPTIONS: AnnotationCategoryOption[] = [
    { id: 'approve_note', label: 'Approve Note', description: 'Record what is already acceptable', kind: 'comment' },
    { id: 'request_change', label: 'Request Change', description: 'Call out a required change', kind: 'requestChange' },
    { id: 'missing_step', label: 'Missing Step', description: 'Capture a missing plan step', kind: 'issue' },
    { id: 'risk', label: 'Risk', description: 'Highlight a delivery or design risk', kind: 'risk' },
    { id: 'replacement', label: 'Replacement', description: 'Suggest a better replacement approach', kind: 'maintainability' },
    { id: 'global_comment', label: 'Global Comment', description: 'Capture artifact-level feedback', kind: 'comment' },
];

const AI_RESPONSE_ANNOTATION_CATEGORY_OPTIONS: AnnotationCategoryOption[] = [
    { id: 'comment', label: 'Comment', description: 'Capture a review note about the response', kind: 'comment' },
    { id: 'request_change', label: 'Request Change', description: 'Call out a required revision', kind: 'requestChange' },
    { id: 'risk', label: 'Risk', description: 'Highlight a risky recommendation or omission', kind: 'risk' },
    { id: 'question', label: 'Question', description: 'Capture a clarification question', kind: 'question' },
    { id: 'suggested_replacement', label: 'Suggested Replacement', description: 'Suggest better wording or replacement text', kind: 'maintainability' },
];

const LOCAL_DIFF_ANNOTATION_CATEGORY_OPTIONS: AnnotationCategoryOption[] = [
    { id: 'bug_risk', label: 'Bug Risk', description: 'Highlight a risky behavior or logic change', kind: 'risk' },
    { id: 'test_gap', label: 'Test Gap', description: 'Capture missing or weak test coverage', kind: 'testGap' },
    { id: 'maintainability', label: 'Maintainability', description: 'Flag readability or complexity concerns', kind: 'maintainability' },
    { id: 'security', label: 'Security', description: 'Highlight a security-sensitive change', kind: 'risk' },
    { id: 'performance', label: 'Performance', description: 'Highlight a performance-sensitive change', kind: 'risk' },
    { id: 'follow_up', label: 'Follow Up', description: 'Capture a deferred follow-up item', kind: 'comment' },
];

interface ReviewArtifactUiCopy {
    panelTitle: string;
    pageTitle: string;
    exportLabel: string;
}

const REVIEW_ARTIFACT_UI_COPY: Record<ReviewArtifactKind, ReviewArtifactUiCopy> = {
    plan: {
        panelTitle: 'Plan Review',
        pageTitle: 'Plan Review',
        exportLabel: 'plan review',
    },
    aiResponse: {
        panelTitle: 'AI Response Review',
        pageTitle: 'AI Response Review',
        exportLabel: 'AI response review',
    },
    localDiff: {
        panelTitle: 'Local Diff Review',
        pageTitle: 'Local Diff Review',
        exportLabel: 'local diff review',
    },
};

export class PlanReviewPanel implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private currentArtifactId: string | undefined;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly reviewArtifactManager: ReviewArtifactManager
    ) {}

    async showArtifact(artifactId: string): Promise<void> {
        this.currentArtifactId = artifactId;

        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'annotative.planReview',
                'Plan Review',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.extensionUri, 'dist', 'media'),
                        vscode.Uri.joinPath(this.extensionUri, 'media'),
                    ],
                }
            );

            this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'images', 'icon.png');
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentArtifactId = undefined;
            }, null, this.disposables);

            this.panel.webview.onDidReceiveMessage(
                async (message: PlanReviewPanelMessage) => {
                    await this.handleMessage(message);
                },
                null,
                this.disposables
            );
        } else {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }

        const artifact = await this.getRequiredArtifact();
        this.panel.title = `${getUiCopy(artifact.kind).panelTitle}: ${artifact.title}`;
        this.panel.webview.html = this.renderHtml(this.panel.webview, artifact);
    }

    dispose(): void {
        this.panel?.dispose();
        while (this.disposables.length > 0) {
            this.disposables.pop()?.dispose();
        }
    }

    private async handleMessage(message: PlanReviewPanelMessage): Promise<void> {
        switch (message.command) {
            case 'refresh':
                await this.refresh();
                return;
            case 'openSource':
                await this.openSource(message);
                return;
            case 'addAnnotation':
                await this.addAnnotation(message);
                return;
            case 'editAnnotation':
                if (message.annotationId) {
                    await this.editAnnotation(message.annotationId);
                }
                return;
            case 'toggleAnnotationStatus':
                if (message.annotationId) {
                    await this.reviewArtifactManager.toggleAnnotationStatus(this.requireArtifactId(), message.annotationId);
                    await this.refresh();
                }
                return;
            case 'deleteAnnotation':
                if (message.annotationId) {
                    await this.deleteAnnotation(message.annotationId);
                }
                return;
            case 'exportArtifact':
                await this.exportArtifact(message.exportTarget ?? 'clipboard');
                return;
        }
    }

    private async addAnnotation(message: PlanReviewPanelMessage): Promise<void> {
        const artifact = await this.getRequiredArtifact();
        const category = await vscode.window.showQuickPick(
            getAnnotationCategoryOptions(artifact.kind).map(option => ({
                label: option.label,
                description: option.description,
                option,
            })),
            { placeHolder: 'Select a review annotation category' }
        );

        if (!category) {
            return;
        }

        const body = await vscode.window.showInputBox({
            prompt: `Enter ${category.option.label.toLowerCase()} details`,
            placeHolder: 'Add review feedback',
            validateInput: value => value.trim().length === 0 ? 'Feedback cannot be empty' : undefined,
        });

        if (body === undefined) {
            return;
        }

        const severity = await pickSeverity(category.option.id);
        if (severity === undefined) {
            return;
        }

        const suggestedReplacement = category.option.id === 'replacement'
            ? await vscode.window.showInputBox({
                prompt: 'Suggested replacement text',
                placeHolder: 'Optional replacement detail',
            })
            : undefined;

        await this.reviewArtifactManager.addAnnotation(artifact.id, {
            kind: category.option.kind,
            severity: severity ?? undefined,
            target: buildTarget(message),
            body,
            suggestedReplacement,
            metadata: {
                category: category.option.id,
            },
        });

        await this.refresh();
    }

    private async editAnnotation(annotationId: string): Promise<void> {
        const artifact = await this.getRequiredArtifact();
        const annotation = artifact.annotations.find(item => item.id === annotationId);
        if (!annotation) {
            return;
        }

        const body = await vscode.window.showInputBox({
            prompt: 'Edit review annotation',
            value: annotation.body,
            validateInput: value => value.trim().length === 0 ? 'Feedback cannot be empty' : undefined,
        });

        if (body === undefined) {
            return;
        }

        const suggestedReplacement = annotation.suggestedReplacement !== undefined
            ? await vscode.window.showInputBox({
                prompt: 'Edit suggested replacement',
                value: annotation.suggestedReplacement,
            })
            : annotation.metadata?.category === 'replacement'
                ? await vscode.window.showInputBox({
                    prompt: 'Suggested replacement text',
                    placeHolder: 'Optional replacement detail',
                })
                : undefined;

        await this.reviewArtifactManager.updateAnnotation(artifact.id, annotation.id, {
            body,
            suggestedReplacement,
        });

        await this.refresh();
    }

    private async deleteAnnotation(annotationId: string): Promise<void> {
        const confirmation = await vscode.window.showWarningMessage(
            'Remove this review annotation?',
            { modal: false },
            'Remove'
        );

        if (confirmation !== 'Remove') {
            return;
        }

        await this.reviewArtifactManager.removeAnnotation(this.requireArtifactId(), annotationId);
        await this.refresh();
    }

    private async exportArtifact(target: ExportTarget): Promise<void> {
        const artifact = await this.getRequiredArtifact();
        const adapter = await this.pickExportAdapter(artifact, target);
        if (!adapter) {
            return;
        }

        const exported = await this.reviewArtifactManager.exportArtifact(artifact, adapter.id);

        if (target === 'clipboard') {
            await vscode.env.clipboard.writeText(exported.content);
            vscode.window.showInformationMessage(`${getUiCopy(artifact.kind).panelTitle} exported to clipboard as ${adapter.label}.`);
        } else {
            const document = await vscode.workspace.openTextDocument({
                content: exported.content,
                language: exported.language,
            });
            await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
        }

        await this.reviewArtifactManager.recordExport(artifact.id, {
            adapterId: exported.adapterId,
            target,
        });

        await this.refresh();
    }

    private async pickExportAdapter(
        artifact: ReviewArtifact,
        target: ExportTarget
    ): Promise<ReviewArtifactExportAdapter | undefined> {
        const adapters = this.reviewArtifactManager.getSupportedExportAdapters(artifact);

        if (adapters.length === 0) {
            throw new Error(`No export adapters support ${artifact.kind} review artifacts.`);
        }

        if (adapters.length === 1) {
            return adapters[0];
        }

        const selected = await vscode.window.showQuickPick(
            adapters.map(adapter => ({
                label: adapter.label,
                description: adapter.description,
                detail: target === 'clipboard'
                    ? 'Copy this export format to the clipboard.'
                    : 'Open this export format in a new document.',
                adapter,
            })),
            {
                placeHolder: `Choose an export format for this ${getUiCopy(artifact.kind).exportLabel}`,
            }
        );

        return selected?.adapter;
    }

    private async openSource(message: PlanReviewPanelMessage): Promise<void> {
        const artifact = await this.getRequiredArtifact();
        const sourceUri = resolveSourceUri(artifact, message);
        if (!sourceUri) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(sourceUri);
            const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
            const startLine = Math.max(0, (message.lineStart ?? 1) - 1);
            const endLine = Math.min(
                document.lineCount - 1,
                Math.max(startLine, (message.lineEnd ?? message.lineStart ?? 1) - 1)
            );
            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).range.end.character);
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            const messageText = error instanceof Error ? error.message : String(error);
            vscode.window.showWarningMessage(`Unable to open diff source: ${messageText}`);
        }
    }

    private async refresh(): Promise<void> {
        if (!this.panel) {
            return;
        }

        const artifact = await this.getRequiredArtifact();
        this.panel.title = `${getUiCopy(artifact.kind).panelTitle}: ${artifact.title}`;
        await this.panel.webview.postMessage({
            command: 'updateArtifact',
            artifact,
        });
    }

    private async getRequiredArtifact(): Promise<ReviewArtifact> {
        const artifactId = this.requireArtifactId();
        const artifact = await this.reviewArtifactManager.getArtifact(artifactId);
        if (!artifact) {
            throw new Error(`Review artifact not found: ${artifactId}`);
        }

        return artifact;
    }

    private requireArtifactId(): string {
        if (!this.currentArtifactId) {
            throw new Error('No review artifact is currently open.');
        }

        return this.currentArtifactId;
    }

    private getWebviewUri(webview: vscode.Webview, fileName: string): vscode.Uri {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'media', fileName));
    }

    private renderHtml(webview: vscode.Webview, artifact: ReviewArtifact): string {
        const nonce = getNonce();
        const cssUri = this.getWebviewUri(webview, 'plan-review-webview.css');
        const jsUri = this.getWebviewUri(webview, 'plan-review-webview.js');
        const initialState = JSON.stringify(artifact).replace(/</g, '\\u003c');
        const uiCopy = getUiCopy(artifact.kind);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${cssUri}">
    <title>${uiCopy.pageTitle}</title>
</head>
<body>
    <div id="plan-review-root"></div>
    <script nonce="${nonce}" id="plan-review-state" type="application/json">${initialState}</script>
    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }
}

function buildTarget(message: PlanReviewPanelMessage): ReviewAnnotationTarget {
    return {
        type: message.targetType ?? 'artifact',
        sectionId: message.sectionId,
        blockId: message.blockId,
        diffFileId: message.diffFileId,
        diffHunkId: message.diffHunkId,
        lineStart: message.lineStart,
        lineEnd: message.lineEnd,
    };
}

function getAnnotationCategoryOptions(kind: ReviewArtifactKind): AnnotationCategoryOption[] {
    switch (kind) {
        case 'aiResponse':
            return AI_RESPONSE_ANNOTATION_CATEGORY_OPTIONS;
        case 'localDiff':
            return LOCAL_DIFF_ANNOTATION_CATEGORY_OPTIONS;
        case 'plan':
        default:
            return ANNOTATION_CATEGORY_OPTIONS;
    }
}

function getUiCopy(kind: ReviewArtifactKind): ReviewArtifactUiCopy {
    return REVIEW_ARTIFACT_UI_COPY[kind];
}

async function pickSeverity(categoryId: string): Promise<ReviewAnnotation['severity'] | null | undefined> {
    if (categoryId === 'approve_note' || categoryId === 'follow_up' || categoryId === 'global_comment') {
        return null;
    }

    const selected = await vscode.window.showQuickPick([
        { label: 'No severity', value: '' },
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
    ], {
        placeHolder: 'Select an optional severity',
    });

    if (!selected) {
        return undefined;
    }

    return selected.value.length > 0 ? selected.value as ReviewAnnotation['severity'] : null;
}

function getNonce(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';

    for (let index = 0; index < 32; index += 1) {
        value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return value;
}

function resolveSourceUri(artifact: ReviewArtifact, message: PlanReviewPanelMessage): vscode.Uri | undefined {
    if (message.sourcePath) {
        const basePath = message.sourceBasePath
            || (typeof artifact.source.metadata?.repositoryRoot === 'string' ? artifact.source.metadata.repositoryRoot : undefined)
            || artifact.source.workspaceFolder;

        if (basePath) {
            return vscode.Uri.file(path.join(basePath, message.sourcePath));
        }
    }

    if (artifact.source.uri?.startsWith('file:')) {
        return vscode.Uri.parse(artifact.source.uri);
    }

    return undefined;
}