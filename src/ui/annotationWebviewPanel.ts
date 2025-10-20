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

    private constructor(
        panel: vscode.WebviewPanel,
        private extensionUri: vscode.Uri,
        private selectedText: string
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent();
        this.setWebviewMessageListener();
    }

    public static createOrShow(extensionUri: vscode.Uri, selectedText: string): Promise<WebviewAnnotationData | undefined> {
        // If we already have a panel, show it
        if (AnnotationWebviewPanel.currentPanel) {
            AnnotationWebviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
            return new Promise((resolve) => {
                AnnotationWebviewPanel.currentPanel!.resolvePromise = resolve;
            });
        }

        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            'annotationWebview',
            'Add Annotation',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        const webviewPanel = new AnnotationWebviewPanel(panel, extensionUri, selectedText);
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

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'">
    <link rel="stylesheet" href="${styleUri}">
    <title>Add Annotation</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Add Annotation</h1>
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
                ></textarea>
                <small class="char-count">0 / 500 characters</small>
            </div>

            <div class="form-group">
                <label for="tags">Tags (comma-separated):</label>
                <input
                    type="text"
                    id="tags"
                    name="tags"
                    placeholder="e.g., bug, review, refactor"
                />
            </div>

            <div class="button-group">
                <button type="submit" class="btn btn-primary">Add Annotation</button>
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
