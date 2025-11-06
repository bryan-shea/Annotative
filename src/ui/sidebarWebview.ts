import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { Annotation } from '../types';
import { generateWebviewHtml } from './webview';
import { WebviewMessage } from './webview/types';

/**
 * Sidebar Webview Provider
 * Implements WebviewViewProvider for the sidebar view
 * Handles resource URIs, CSP headers, and message routing
 */
export class SidebarWebview implements vscode.WebviewViewProvider {
    public static readonly viewType = 'annotativeView';

    private view?: vscode.WebviewView;
    private annotationManager: AnnotationManager;
    private disposables: vscode.Disposable[] = [];

    constructor(private extensionUri: vscode.Uri, annotationManager: AnnotationManager) {
        this.annotationManager = annotationManager;
    }

    /**
     * Implement WebviewViewProvider.resolveWebviewView
     * Called when the view is first created
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
        };

        // Set initial HTML
        this.setWebviewContent(webviewView.webview);

        // Setup message handlers
        this.setupMessageHandling(webviewView.webview);

        // Load initial data
        this.loadInitialData(webviewView.webview);
    }

    /**
     * Show or focus the sidebar view
     */
    async show() {
        if (this.view) {
            await vscode.commands.executeCommand('annotativeView.focus');
        }
    }

    /**
     * Toggle visibility of the sidebar view
     */
    async toggle() {
        if (this.view) {
            await vscode.commands.executeCommand('workbench.view.extension.annotative');
        } else {
            await vscode.commands.executeCommand('annotativeView.focus');
        }
    }

    /**
     * Refresh annotations in the webview
     */
    refreshAnnotations() {
        if (this.view) {
            this.loadInitialData(this.view.webview);
        }
    }

    /**
     * Get the webview URI for a resource file
     */
    private getWebviewUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
        return webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', ...pathSegments)
        );
    }

    /**
     * Set the webview HTML content with proper resource URIs
     */
    private setWebviewContent(webview: vscode.Webview) {
        const cssUri = this.getWebviewUri(webview, 'sidebar-webview.css');
        const jsUri = this.getWebviewUri(webview, 'sidebar-webview.js');
        const nonce = this.getNonce();

        const html = generateWebviewHtml({
            cssUri: cssUri.toString(),
            jsUri: jsUri.toString(),
            nonce,
            cspSource: webview.cspSource,
        });

        webview.html = html;
    }

    /**
     * Load initial annotation data
     */
    private loadInitialData(webview: vscode.Webview) {
        const annotations = this.annotationManager.getAllAnnotations();
        webview.postMessage({
            command: 'updateAnnotations',
            annotations,
        });

        const tags = this.annotationManager.getAllTags();
        webview.postMessage({
            command: 'tagsUpdated',
            tags,
        });
    }

    /**
     * Setup message handling from webview
     */
    private setupMessageHandling(webview: vscode.Webview) {
        const disposable = webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'requestAnnotations':
                        this.loadInitialData(webview);
                        break;

                    case 'navigate':
                        if (message.annotation) {
                            await this.handleNavigate(message.annotation);
                        }
                        break;

                    case 'toggleResolved':
                        if (typeof message.id === 'string') {
                            await this.handleToggleResolved(message.id);
                            // Refresh webview after changes
                            setTimeout(() => this.loadInitialData(webview), 100);
                        }
                        break;

                    case 'delete':
                        if (typeof message.id === 'string') {
                            await this.handleDelete(message.id);
                            // Refresh webview after changes
                            setTimeout(() => this.loadInitialData(webview), 100);
                        }
                        break;

                    case 'resolveAll':
                        await this.handleResolveAll();
                        // Refresh webview after changes
                        setTimeout(() => this.loadInitialData(webview), 100);
                        break;

                    case 'deleteResolved':
                        await this.handleDeleteResolved();
                        // Refresh webview after changes
                        setTimeout(() => this.loadInitialData(webview), 100);
                        break;

                    case 'addTag':
                        if (message.id && message.tag) {
                            await this.handleAddTag(message.id, message.tag);
                            setTimeout(() => this.loadInitialData(webview), 100);
                        }
                        break;

                    case 'removeTag':
                        if (message.id && message.tag) {
                            await this.handleRemoveTag(message.id, message.tag);
                            setTimeout(() => this.loadInitialData(webview), 100);
                        }
                        break;

                    case 'manageTags':
                        if (message.id && message.tags) {
                            await this.handleManageTags(message.id, message.tags);
                            setTimeout(() => this.loadInitialData(webview), 100);
                        }
                        break;
                }
            },
            null,
            this.disposables
        );

        this.disposables.push(disposable);
    }

    /**
     * Navigate to annotation in editor
     */
    private async handleNavigate(annotation: Annotation) {
        try {
            const uri = vscode.Uri.file(annotation.filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);

            const range = new vscode.Range(
                annotation.range.start.line,
                annotation.range.start.character,
                annotation.range.end.line,
                annotation.range.end.character
            );

            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to navigate: ${error}`);
        }
    }

    /**
     * Toggle resolved status
     */
    private async handleToggleResolved(id: string) {
        try {
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const annotation = allAnnotations.find((a) => a.id === id);

            if (annotation) {
                await this.annotationManager.toggleResolvedStatus(id, annotation.filePath);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to toggle status: ${error}`);
        }
    }

    /**
     * Delete annotation
     */
    private async handleDelete(id: string) {
        try {
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const annotation = allAnnotations.find((a) => a.id === id);

            if (annotation) {
                await this.annotationManager.removeAnnotation(id, annotation.filePath);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete annotation: ${error}`);
        }
    }

    /**
     * Resolve all visible annotations
     */
    private async handleResolveAll() {
        try {
            await this.annotationManager.resolveAll();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to resolve all: ${error}`);
        }
    }

    /**
     * Delete all resolved annotations
     */
    private async handleDeleteResolved() {
        try {
            await this.annotationManager.deleteResolved();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete resolved: ${error}`);
        }
    }

    /**
     * Add a tag to an annotation
     */
    private async handleAddTag(id: string, tag: string) {
        try {
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const annotation = allAnnotations.find((a) => a.id === id);

            if (annotation) {
                const currentTags = annotation.tags?.map((t) =>
                    typeof t === 'string' ? t : t.id
                ) || [];

                if (!currentTags.includes(tag)) {
                    const updatedTags = [...currentTags, tag];
                    await this.annotationManager.editAnnotation(
                        id,
                        annotation.filePath,
                        annotation.comment,
                        updatedTags,
                        annotation.color
                    );
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add tag: ${error}`);
        }
    }

    /**
     * Remove a tag from an annotation
     */
    private async handleRemoveTag(id: string, tag: string) {
        try {
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const annotation = allAnnotations.find((a) => a.id === id);

            if (annotation) {
                const currentTags = annotation.tags?.map((t) =>
                    typeof t === 'string' ? t : t.id
                ) || [];

                const updatedTags = currentTags.filter(t => t !== tag);
                await this.annotationManager.editAnnotation(
                    id,
                    annotation.filePath,
                    annotation.comment,
                    updatedTags,
                    annotation.color
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove tag: ${error}`);
        }
    }

    /**
     * Manage tags for an annotation (update full tag list)
     */
    private async handleManageTags(id: string, tags: string[]) {
        try {
            const allAnnotations = this.annotationManager.getAllAnnotations();
            const annotation = allAnnotations.find((a) => a.id === id);

            if (annotation) {
                await this.annotationManager.editAnnotation(
                    id,
                    annotation.filePath,
                    annotation.comment,
                    tags,
                    annotation.color
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to manage tags: ${error}`);
        }
    }

    /**
     * Generate a nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Cleanup disposables
     */
    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}
