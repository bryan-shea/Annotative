import * as vscode from 'vscode';
import { Annotation } from '../types';

export class AnnotationDashboard {
    public static currentPanel: AnnotationDashboard | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private annotations: Annotation[] = [];
    private filterStatus: 'all' | 'unresolved' | 'resolved' = 'all';
    private filterTag: string = 'all';
    private searchQuery: string = '';

    private constructor(
        panel: vscode.WebviewPanel,
        private extensionUri: vscode.Uri,
        private onMessage: (message: any) => void
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent();
        this.setWebviewMessageListener();

        // Listen for panel disposal
        this.panel.onDidDispose(() => {
            this.dispose();
        }, null, this.disposables);

        // Listen for visibility changes
        this.panel.onDidChangeViewState(
            () => {
                if (this.panel.visible) {
                    this.refresh();
                }
            },
            null,
            this.disposables
        );
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        onMessage: (message: any) => void
    ): AnnotationDashboard {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (AnnotationDashboard.currentPanel) {
            AnnotationDashboard.currentPanel.panel.reveal(column);
            return AnnotationDashboard.currentPanel;
        }

        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            'annotationDashboard',
            'Annotative Dashboard',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'dist')
                ]
            }
        );

        const dashboard = new AnnotationDashboard(panel, extensionUri, onMessage);
        AnnotationDashboard.currentPanel = dashboard;

        return dashboard;
    }

    public updateAnnotations(annotations: Annotation[]) {
        this.annotations = annotations;
        this.refresh();
    }

    public refresh() {
        this.panel.webview.postMessage({
            command: 'updateAnnotations',
            annotations: this.getFilteredAnnotations(),
            stats: this.getStats()
        });
    }

    private getFilteredAnnotations(): Annotation[] {
        return this.annotations.filter(annotation => {
            // Filter by status
            if (this.filterStatus === 'resolved' && !annotation.resolved) {
                return false;
            }
            if (this.filterStatus === 'unresolved' && annotation.resolved) {
                return false;
            }

            // Filter by tag
            if (this.filterTag !== 'all') {
                if (!annotation.tags || !annotation.tags.includes(this.filterTag)) {
                    return false;
                }
            }

            // Filter by search query
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                const commentMatch = annotation.comment.toLowerCase().includes(searchLower);
                const textMatch = annotation.text.toLowerCase().includes(searchLower);
                const authorMatch = annotation.author.toLowerCase().includes(searchLower);
                const tagMatch = annotation.tags?.some(tag => tag.toLowerCase().includes(searchLower));

                if (!commentMatch && !textMatch && !authorMatch && !tagMatch) {
                    return false;
                }
            }

            return true;
        });
    }

    private getStats() {
        const total = this.annotations.length;
        const resolved = this.annotations.filter(a => a.resolved).length;
        const unresolved = total - resolved;

        // Group by file
        const byFile = new Map<string, number>();
        this.annotations.forEach(a => {
            const relativePath = vscode.workspace.asRelativePath(a.filePath);
            byFile.set(relativePath, (byFile.get(relativePath) || 0) + 1);
        });

        // Get all unique tags
        const allTags = new Set<string>();
        this.annotations.forEach(a => {
            a.tags?.forEach(tag => allTags.add(tag));
        });

        return {
            total,
            resolved,
            unresolved,
            fileCount: byFile.size,
            allTags: Array.from(allTags).sort()
        };
    }

    private setWebviewMessageListener() {
        this.panel.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case 'filterByStatus':
                        this.filterStatus = message.status;
                        this.refresh();
                        break;
                    case 'filterByTag':
                        this.filterTag = message.tag;
                        this.refresh();
                        break;
                    case 'search':
                        this.searchQuery = message.query;
                        this.refresh();
                        break;
                    case 'clearFilters':
                        this.filterStatus = 'all';
                        this.filterTag = 'all';
                        this.searchQuery = '';
                        this.refresh();
                        break;
                    default:
                        // Forward to extension
                        this.onMessage(message);
                        break;
                }
            },
            undefined,
            this.disposables
        );
    }

    public dispose() {
        AnnotationDashboard.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getWebviewContent(): string {
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.js')
        );
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
    <title>Annotative Dashboard</title>
</head>
<body>
    <div class="dashboard">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>📝 Annotative</h1>
                <p class="tagline">Code annotations made simple</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="addAnnotationBtn" title="Add new annotation (Ctrl+Shift+A)">
                    <span class="icon">➕</span> Add Annotation
                </button>
                <button class="btn btn-secondary" id="exportBtn" title="Export to Markdown">
                    <span class="icon">📋</span> Export
                </button>
                <button class="btn btn-secondary" id="exportCopilotBtn" title="Export all annotations for GitHub Copilot">
                    <span class="icon">🤖</span> Export for Copilot
                </button>
                <button class="btn btn-accent" id="exportSelectedBtn" title="Export selected annotations" disabled>
                    <span class="icon">✨</span> Export Selected
                </button>
            </div>
        </header>

        <!-- Stats Section -->
        <section class="stats-section">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <div class="stat-value" id="totalCount">0</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔍</div>
                <div class="stat-content">
                    <div class="stat-value" id="unresolvedCount">0</div>
                    <div class="stat-label">Unresolved</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                    <div class="stat-value" id="resolvedCount">0</div>
                    <div class="stat-label">Resolved</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📁</div>
                <div class="stat-content">
                    <div class="stat-value" id="fileCount">0</div>
                    <div class="stat-label">Files</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">☑️</div>
                <div class="stat-content">
                    <div class="stat-value" id="selectedCount">0</div>
                    <div class="stat-label">Selected</div>
                </div>
            </div>
        </section>

        <!-- Filters and Search -->
        <section class="filters-section">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input
                    type="text"
                    id="searchInput"
                    placeholder="Search annotations, code, author, or tags..."
                    aria-label="Search annotations"
                />
                <button class="clear-search" id="clearSearchBtn" title="Clear search">✕</button>
            </div>

            <div class="filter-controls">
                <div class="filter-group">
                    <label for="statusFilter">Status:</label>
                    <select id="statusFilter" aria-label="Filter by status">
                        <option value="all">All Annotations</option>
                        <option value="unresolved">Unresolved Only</option>
                        <option value="resolved">Resolved Only</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label for="tagFilter">Tag:</label>
                    <select id="tagFilter" aria-label="Filter by tag">
                        <option value="all">All Tags</option>
                    </select>
                </div>

                <button class="btn btn-link" id="clearFiltersBtn">Clear Filters</button>
                <button class="btn btn-link" id="selectAllBtn" title="Select/deselect all visible annotations">
                    <span class="icon">☑️</span> Select All
                </button>
            </div>
        </section>

        <!-- Annotations List -->
        <section class="annotations-section">
            <div class="section-header">
                <h2>Annotations</h2>
                <div class="view-options">
                    <button class="view-btn active" data-view="grouped" title="Group by file">
                        <span class="icon">📂</span>
                    </button>
                    <button class="view-btn" data-view="list" title="List view">
                        <span class="icon">📋</span>
                    </button>
                </div>
            </div>

            <div id="annotationsList" class="annotations-list">
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No annotations yet</h3>
                    <p>Select some code and press <kbd>Ctrl+Shift+A</kbd> to add your first annotation.</p>
                </div>
            </div>
        </section>

        <!-- Quick Actions Footer -->
        <footer class="dashboard-footer">
            <div class="quick-actions">
                <button class="quick-action-btn" id="resolveAllBtn" title="Resolve all annotations">
                    <span class="icon">✅</span> Resolve All
                </button>
                <button class="quick-action-btn" id="deleteResolvedBtn" title="Delete resolved annotations">
                    <span class="icon">🗑️</span> Delete Resolved
                </button>
            </div>
            <div class="keyboard-hint">
                Press <kbd>?</kbd> for keyboard shortcuts
            </div>
        </footer>
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
}
