import * as vscode from 'vscode';

export interface WebviewAnnotationData {
    comment: string;
    tags?: string[];
}

export class AnnotationWebviewPanel {
    public static currentPanel: AnnotationWebviewPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private resolvePromise: ((data: WebviewAnnotationData | undefined) => void) | undefined;
    private isDisposed: boolean = false;

    private constructor(
        panel: vscode.WebviewPanel,
        private extensionUri: vscode.Uri,
        private selectedText: string,
        private initialComment?: string,
        private initialTags?: string[],
        private isReadOnly: boolean = false,
        private filePath?: string,
        private lineRange?: { start: number; end: number }
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent();
        this.setWebviewMessageListener();

        // Listen for panel disposal
        this.panel.onDidDispose(() => {
            this.isDisposed = true;
            this.dispose();
        }, null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        selectedText: string,
        initialComment?: string,
        initialTags?: string[],
        isReadOnly: boolean = false,
        filePath?: string,
        lineRange?: { start: number; end: number }
    ): Promise<WebviewAnnotationData | undefined> {
        // If we already have a panel and it's not disposed, dispose it first
        if (AnnotationWebviewPanel.currentPanel && !AnnotationWebviewPanel.currentPanel.isDisposed) {
            AnnotationWebviewPanel.currentPanel.dispose();
        }

        // Always create a new panel
        const panel = vscode.window.createWebviewPanel(
            'annotationWebview',
            isReadOnly ? 'View Annotation' : (initialComment ? 'Edit Annotation' : 'Add Annotation'),
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        const webviewPanel = new AnnotationWebviewPanel(
            panel,
            extensionUri,
            selectedText,
            initialComment,
            initialTags,
            isReadOnly,
            filePath,
            lineRange
        );
        AnnotationWebviewPanel.currentPanel = webviewPanel;

        return new Promise((resolve) => {
            webviewPanel.resolvePromise = resolve;
        });
    }

    private setWebviewMessageListener() {
        this.panel.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case 'submit':
                        this.handleSubmit(message);
                        break;
                    case 'cancel':
                        this.handleCancel();
                        break;
                }
            },
            undefined,
            this.disposables
        );
    }

    private handleSubmit(message: any) {
        const data: WebviewAnnotationData = {
            comment: message.comment,
            tags: message.tags ? message.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : []
        };

        if (this.resolvePromise) {
            this.resolvePromise(data);
        }

        this.dispose();
    }

    private handleCancel() {
        if (this.resolvePromise) {
            this.resolvePromise(undefined);
        }

        this.dispose();
    }

    public dispose() {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;
        AnnotationWebviewPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'annotation-style.css')
        );
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'annotation-script.js')
        );

        const nonce = this.getNonce();
        const isEditing = !!this.initialComment && !this.isReadOnly;
        const title = this.isReadOnly ? 'Annotation Details' : (isEditing ? 'Edit Annotation' : 'Add Annotation');
        const buttonText = isEditing ? 'Update Annotation' : 'Add Annotation';
        const initialCommentValue = this.escapeHtml(this.initialComment || '');
        const initialTagsValue = this.escapeHtml(this.initialTags?.join(', ') || '');

        // Format file path and line range for display
        let locationInfo = '';
        if (this.filePath && this.lineRange) {
            const relativePath = vscode.workspace.asRelativePath(this.filePath);
            const lineStart = this.lineRange.start + 1; // Convert to 1-based
            const lineEnd = this.lineRange.end + 1; // Convert to 1-based
            const lineDisplay = lineStart === lineEnd
                ? `Line ${lineStart}`
                : `Lines ${lineStart}-${lineEnd}`;
            locationInfo = `${relativePath} (${lineDisplay})`;
        }

        // Read-only view
        if (this.isReadOnly) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p class="subtitle">View annotation details</p>
        </div>

        ${locationInfo ? `
        <div class="location-section">
            <label>Location:</label>
            <div class="location-info">
                <code>${this.escapeHtml(locationInfo)}</code>
            </div>
        </div>
        ` : ''}

        <div class="selected-text-section">
            <label>Selected Code:</label>
            <pre class="code-block">${this.escapeHtml(this.selectedText)}</pre>
        </div>

        <div class="form-group">
            <label>Comment:</label>
            <div class="readonly-field">${this.escapeHtml(this.initialComment || 'No comment')}</div>
        </div>

        <div class="form-group">
            <label>Tags:</label>
            <div class="readonly-field">${initialTagsValue || 'No tags'}</div>
        </div>

        <div class="button-group">
            <button type="button" class="btn btn-secondary" id="cancelBtn">Close</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });
    </script>
</body>
</html>`;
        }

        // Editable form
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p class="subtitle">Annotate the selected code</p>
        </div>

        <div class="selected-text-section">
            <label for="selectedText">Selected Code:</label>
            <pre id="selectedText" class="code-block">${this.escapeHtml(this.selectedText)}</pre>
        </div>

        <form id="annotationForm">
            <div class="form-group">
                <label for="comment">Comment <span class="required">*</span>:</label>
                <textarea
                    id="comment"
                    name="comment"
                    rows="6"
                    placeholder="Enter your annotation comment..."
                    required
                >${initialCommentValue}</textarea>
                <small class="char-count">0 / 500 characters</small>
            </div>

            <div class="form-group">
                <label for="tags">Tags (comma-separated):</label>
                <input
                    type="text"
                    id="tags"
                    name="tags"
                    placeholder="e.g., bug, review, refactor"
                    value="${initialTagsValue}"
                />
            </div>

            <div class="button-group">
                <button type="submit" class="btn btn-primary">${buttonText}</button>
                <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
            </div>
        </form>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}
