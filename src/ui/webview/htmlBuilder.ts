/**
 * Webview HTML Builder
 * Generates the complete webview HTML structure with no emojis
 * Entire UI is webview-based with no standard sidebar elements
 */

import * as vscode from 'vscode';

export interface HtmlBuilderOptions {
  cssUri: string;
  jsUri: string;
  nonce: string;
  cspSource: string;
}

/**
 * Generate the complete webview HTML
 */
export function generateWebviewHtml(options: HtmlBuilderOptions): string {
  const { cssUri, jsUri, nonce, cspSource } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'; img-src ${cspSource}">
    <link rel="stylesheet" href="${cssUri}">
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

                <!-- Search Row -->
                <div class="search-row">
                    <input
                        id="search-input"
                        type="text"
                        class="search-input"
                        placeholder="Search annotations..."
                        aria-label="Search annotations"
                    />
                    <button
                        id="btn-clear-search"
                        class="icon-button search-clear"
                        title="Clear search"
                        aria-label="Clear"
                    >
                        <span class="icon">close</span>
                    </button>
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
                    <span class="icon">check</span>
                    <span class="action-label">Resolve All</span>
                </button>
                <button
                    id="btn-delete-resolved"
                    class="action-button action-delete"
                    title="Delete all resolved annotations"
                >
                    <span class="icon">delete</span>
                    <span class="action-label">Delete Resolved</span>
                </button>
            </div>
        </footer>
    </div>

    <!-- Context Menu -->
    <div id="annotation-context-menu" class="context-menu" style="display: none">
        <button class="context-menu-item" data-action="edit">
            <span class="icon">edit</span>
            <span>Edit</span>
        </button>
        <button class="context-menu-item" data-action="toggle">
            <span class="icon">check_circle</span>
            <span>Toggle Resolution</span>
        </button>
        <button class="context-menu-item" data-action="navigate">
            <span class="icon">arrow_forward</span>
            <span>Go to Location</span>
        </button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item danger" data-action="delete">
            <span class="icon">delete</span>
            <span>Delete</span>
        </button>
    </div>

    <script nonce="${nonce}" src="${jsUri}"><\/script>
</body>
</html>`;
}
