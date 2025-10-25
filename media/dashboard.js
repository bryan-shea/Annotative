// @ts-nocheck
// Dashboard JavaScript for Annotative extension

(function () {
    const vscode = acquireVsCodeApi();

    let annotations = [];
    let stats = {};
    let currentView = 'grouped'; // 'grouped' or 'list'
    let selectedAnnotations = new Set(); // Track selected annotation IDs

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        statusFilter: document.getElementById('statusFilter'),
        tagFilter: document.getElementById('tagFilter'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),
        annotationsList: document.getElementById('annotationsList'),
        addAnnotationBtn: document.getElementById('addAnnotationBtn'),
        exportBtn: document.getElementById('exportBtn'),
        exportCopilotBtn: document.getElementById('exportCopilotBtn'),
        exportSelectedBtn: document.getElementById('exportSelectedBtn'),
        selectAllBtn: document.getElementById('selectAllBtn'),
        resolveAllBtn: document.getElementById('resolveAllBtn'),
        deleteResolvedBtn: document.getElementById('deleteResolvedBtn'),
        totalCount: document.getElementById('totalCount'),
        unresolvedCount: document.getElementById('unresolvedCount'),
        resolvedCount: document.getElementById('resolvedCount'),
        fileCount: document.getElementById('fileCount'),
        selectedCount: document.getElementById('selectedCount'),
        viewBtns: document.querySelectorAll('.view-btn')
    };

    // Initialize
    init();

    function init() {
        setupEventListeners();
        requestUpdate();
    }

    function setupEventListeners() {
        // Search
        elements.searchInput.addEventListener('input', (e) => {
            vscode.postMessage({
                command: 'search',
                query: e.target.value
            });
        });

        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            vscode.postMessage({
                command: 'search',
                query: ''
            });
        });

        // Filters
        elements.statusFilter.addEventListener('change', (e) => {
            vscode.postMessage({
                command: 'filterByStatus',
                status: e.target.value
            });
        });

        elements.tagFilter.addEventListener('change', (e) => {
            vscode.postMessage({
                command: 'filterByTag',
                tag: e.target.value
            });
        });

        elements.clearFiltersBtn.addEventListener('click', () => {
            elements.statusFilter.value = 'all';
            elements.tagFilter.value = 'all';
            elements.searchInput.value = '';
            vscode.postMessage({ command: 'clearFilters' });
        });

        // View toggle
        elements.viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                switchView(view);
            });
        });

        // Actions
        elements.addAnnotationBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'addAnnotation' });
        });

        elements.exportBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'export' });
        });

        if (elements.exportCopilotBtn) {
            elements.exportCopilotBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'exportCopilot' });
            });
        }

        if (elements.exportSelectedBtn) {
            elements.exportSelectedBtn.addEventListener('click', () => {
                const selected = Array.from(selectedAnnotations);
                vscode.postMessage({
                    command: 'exportSelected',
                    selectedIds: selected
                });
            });
        }

        if (elements.selectAllBtn) {
            elements.selectAllBtn.addEventListener('click', () => {
                toggleSelectAll();
            });
        }

        elements.resolveAllBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'resolveAll' });
        });

        elements.deleteResolvedBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'deleteResolved' });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Message from extension
        window.addEventListener('message', handleMessage);
    }

    function handleMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'updateAnnotations':
                annotations = message.annotations;
                stats = message.stats;
                updateUI();
                break;
        }
    }

    function requestUpdate() {
        vscode.postMessage({ command: 'refresh' });
    }

    function updateUI() {
        updateStats();
        updateTagFilter();
        renderAnnotations();
    }

    function updateStats() {
        elements.totalCount.textContent = stats.total || 0;
        elements.unresolvedCount.textContent = stats.unresolved || 0;
        elements.resolvedCount.textContent = stats.resolved || 0;
        elements.fileCount.textContent = stats.fileCount || 0;

        if (elements.selectedCount) {
            elements.selectedCount.textContent = selectedAnnotations.size;
            elements.exportSelectedBtn.disabled = selectedAnnotations.size === 0;
        }
    }

    function toggleSelectAll() {
        if (selectedAnnotations.size === annotations.length) {
            // Deselect all
            selectedAnnotations.clear();
        } else {
            // Select all
            selectedAnnotations.clear();
            annotations.forEach(a => selectedAnnotations.add(a.id));
        }
        renderAnnotations();
    }

    function toggleSelection(annotationId) {
        if (selectedAnnotations.has(annotationId)) {
            selectedAnnotations.delete(annotationId);
        } else {
            selectedAnnotations.add(annotationId);
        }
        updateUI();
    }

    function updateTagFilter() {
        const currentValue = elements.tagFilter.value;
        elements.tagFilter.innerHTML = '<option value="all">All Tags</option>';

        if (stats.allTags && stats.allTags.length > 0) {
            stats.allTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                elements.tagFilter.appendChild(option);
            });
        }

        elements.tagFilter.value = currentValue;
    }

    function renderAnnotations() {
        if (!annotations || annotations.length === 0) {
            showEmptyState();
            return;
        }

        if (currentView === 'grouped') {
            renderGroupedView();
        } else {
            renderListView();
        }
    }

    function showEmptyState() {
        elements.annotationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No annotations found</h3>
                <p>Try adjusting your filters or add a new annotation with <kbd>Ctrl+Shift+A</kbd></p>
            </div>
        `;
    }

    function renderGroupedView() {
        // Group by file
        const groupedByFile = {};
        annotations.forEach(annotation => {
            const relativePath = getRelativePath(annotation.filePath);
            if (!groupedByFile[relativePath]) {
                groupedByFile[relativePath] = [];
            }
            groupedByFile[relativePath].push(annotation);
        });

        let html = '';
        Object.keys(groupedByFile).sort().forEach(filePath => {
            const fileAnnotations = groupedByFile[filePath];
            const unresolvedCount = fileAnnotations.filter(a => !a.resolved).length;

            html += `
                <div class="file-group">
                    <div class="file-group-header">
                        <span class="file-group-icon">📄</span>
                        <span class="file-group-path">${escapeHtml(filePath)}</span>
                        <span class="file-group-count">${unresolvedCount}/${fileAnnotations.length}</span>
                    </div>
                    <div class="file-group-content">
                        ${fileAnnotations.map(a => createAnnotationCard(a)).join('')}
                    </div>
                </div>
            `;
        });

        elements.annotationsList.innerHTML = html;
        attachCardListeners();
    }

    function renderListView() {
        const html = annotations.map(a => createAnnotationCard(a)).join('');
        elements.annotationsList.innerHTML = html;
        attachCardListeners();
    }

    function createAnnotationCard(annotation) {
        const relativePath = getRelativePath(annotation.filePath);
        const lineStart = annotation.range.start.line + 1;
        const lineEnd = annotation.range.end.line + 1;
        const lineDisplay = lineStart === lineEnd ? `Line ${lineStart}` : `Lines ${lineStart}-${lineEnd}`;
        const statusClass = annotation.resolved ? 'resolved' : 'unresolved';
        const statusText = annotation.resolved ? '✅ Resolved' : '🔍 Unresolved';
        const isSelected = selectedAnnotations.has(annotation.id);
        const tagsHtml = annotation.tags && annotation.tags.length > 0
            ? `<div class="annotation-tags">${annotation.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';

        return `
            <div class="annotation-card ${statusClass} ${isSelected ? 'selected' : ''}" data-id="${annotation.id}">
                <div class="annotation-header">
                    <div class="annotation-select">
                        <input
                            type="checkbox"
                            class="annotation-checkbox"
                            data-id="${annotation.id}"
                            ${isSelected ? 'checked' : ''}
                            title="Select for export"
                        />
                    </div>
                    <div class="annotation-meta">
                        <div class="annotation-location">📁 ${escapeHtml(relativePath)} (${lineDisplay})</div>
                        <span class="annotation-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="annotation-actions">
                        <button class="action-btn view-btn-action" data-id="${annotation.id}" title="View details">
                            👁️
                        </button>
                        <button class="action-btn edit-btn-action" data-id="${annotation.id}" title="Edit">
                            ✏️
                        </button>
                        <button class="action-btn toggle-btn-action" data-id="${annotation.id}" title="Toggle resolved">
                            ${annotation.resolved ? '↩️' : '✓'}
                        </button>
                        <button class="action-btn delete-btn-action" data-id="${annotation.id}" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="annotation-comment">${escapeHtml(annotation.comment)}</div>

                <pre class="annotation-code">${escapeHtml(annotation.text)}</pre>

                ${tagsHtml}

                <div class="annotation-footer">
                    <span>👤 ${escapeHtml(annotation.author)}</span>
                    <span>📅 ${formatDate(annotation.timestamp)}</span>
                </div>
            </div>
        `;
    }

    function attachCardListeners() {
        // Checkbox selection
        document.querySelectorAll('.annotation-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent card navigation
                const id = checkbox.dataset.id;
                toggleSelection(id);
            });
        });

        // Card click to navigate
        document.querySelectorAll('.annotation-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking action buttons or checkbox
                if (e.target.closest('.action-btn') || e.target.closest('.annotation-checkbox')) {
                    return;
                }
                const id = card.dataset.id;
                vscode.postMessage({
                    command: 'goToAnnotation',
                    id: id
                });
            });
        });

        // Action buttons
        document.querySelectorAll('.view-btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                vscode.postMessage({
                    command: 'viewAnnotation',
                    id: id
                });
            });
        });

        document.querySelectorAll('.edit-btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                vscode.postMessage({
                    command: 'editAnnotation',
                    id: id
                });
            });
        });

        document.querySelectorAll('.toggle-btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                vscode.postMessage({
                    command: 'toggleResolved',
                    id: id
                });
            });
        });

        document.querySelectorAll('.delete-btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                vscode.postMessage({
                    command: 'removeAnnotation',
                    id: id
                });
            });
        });
    }

    function switchView(view) {
        currentView = view;
        elements.viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        renderAnnotations();
    }

    function handleKeyboard(e) {
        // Ctrl+Shift+A or Cmd+Shift+A - Add annotation
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            vscode.postMessage({ command: 'addAnnotation' });
        }

        // Ctrl+E or Cmd+E - Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            vscode.postMessage({ command: 'export' });
        }

        // ? - Show shortcuts
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            showKeyboardShortcuts();
        }
    }

    function showKeyboardShortcuts() {
        vscode.postMessage({ command: 'showShortcuts' });
    }

    function getRelativePath(filePath) {
        // This will be the relative path already from the extension
        return filePath;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
