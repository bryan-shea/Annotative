/**
 * Webview HTML Builder
 * Generates the complete webview HTML structure with no emojis
 * Entire UI is webview-based with no standard sidebar elements
 */

import * as vscode from 'vscode';

export interface HtmlBuilderOptions {
  cssUri: string;
  jsUri: string;
  codiconUri?: string;
  nonce: string;
  cspSource: string;
}

/**
 * Generate the complete webview HTML
 */
export function generateWebviewHtml(options: HtmlBuilderOptions): string {
  const { cssUri, jsUri, codiconUri, nonce, cspSource } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} https://cdn.jsdelivr.net; font-src ${cspSource} https://cdn.jsdelivr.net; script-src 'nonce-${nonce}'; img-src ${cspSource} data:">
    <link rel="stylesheet" href="${cssUri}">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css">
    <title>Annotations</title>
</head>
<body>
    <div class="app-container">
        <!-- Main Content Area - Uses VS Code Standard Header -->
        <main class="app-content">
            <!-- Controls Section -->
            <section class="controls-section">
                <!-- Filter Row -->
                <div class="filter-row">
                    <select id="filter-status" class="filter-select" title="Filter by status">
                        <option value="all">All Status</option>
                        <option value="unresolved">Unresolved</option>
                        <option value="resolved">Resolved</option>
                    </select>
                    <select id="filter-tag" class="filter-select" title="Filter by tag">
                        <option value="all">All Tags</option>
                    </select>
                </div>

                <!-- Group By Row -->
                <div class="groupby-row">
                    <label for="groupby-select" class="groupby-label">Group by:</label>
                    <select id="groupby-select" class="filter-select" title="Group annotations">
                        <option value="file">File</option>
                        <option value="tag">Tag</option>
                        <option value="status">Status</option>
                        <option value="folder">Folder</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </section>

            <!-- Annotations List -->
            <section class="annotations-section">
                <div id="annotations-list" class="annotations-list">
                    <div class="empty-state">
                        <div class="empty-icon">list_alt</div>
                        <h3 class="empty-title">No Annotations</h3>
                        <p class="empty-text">
                            Select code and press <code>Ctrl+Shift+A</code> to add an annotation
                        </p>
                    </div>
                </div>
            </section>
        </main>

        <!-- Footer Section -->
        <footer class="app-footer">
            <!-- Statistics -->
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value" id="stat-total">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Unresolved</span>
                    <span class="stat-value unresolved" id="stat-unresolved">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Resolved</span>
                    <span class="stat-value resolved" id="stat-resolved">0</span>
                </div>
            </div>

            <!-- Bulk Actions -->
            <div class="bulk-actions">
                <button
                    id="btn-resolve-all"
                    class="action-button action-resolve"
                    title="Mark all visible as resolved"
                >
                    <i class="codicon codicon-check"></i>
                    <span class="action-label">Resolve All</span>
                </button>
                <button
                    id="btn-delete-resolved"
                    class="action-button action-delete"
                    title="Delete all resolved annotations"
                >
                    <i class="codicon codicon-trash"></i>
                    <span class="action-label">Delete Resolved</span>
                </button>
            </div>
        </footer>
    </div>

    <!-- Context Menu -->
    <div id="annotation-context-menu" class="context-menu" style="display: none">
        <button class="context-menu-item" data-action="edit">
            <i class="codicon codicon-edit"></i>
            <span>Edit</span>
        </button>
        <button class="context-menu-item" data-action="toggle">
            <i class="codicon codicon-pass"></i>
            <span>Toggle Resolution</span>
        </button>
        <button class="context-menu-item" data-action="navigate">
            <i class="codicon codicon-go-to-file"></i>
            <span>Go to Location</span>
        </button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item danger" data-action="delete">
            <i class="codicon codicon-trash"></i>
            <span>Delete</span>
        </button>
    </div>

    <!-- Tag Picker Modal -->
    <div id="tag-picker-modal" class="modal" style="display: none">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add Tag</h3>
                <button class="modal-close" id="tag-picker-close">
                    <i class="codicon codicon-close"></i>
                </button>
            </div>
            <div class="modal-body">
                <div id="tag-picker-list" class="tag-picker-list"></div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}" src="${jsUri}"><\/script>
</body>
</html>`;
}
