/**
 * Main Sidebar Webview Script
 * Initializes and orchestrates the annotation sidebar
 */

// Import modules (module references defined inline below)
// These will be concatenated by the build system

const vscode = acquireVsCodeApi();

// State management
const state = {
  annotations: [],
  filters: {
    status: 'all',
    tag: 'all',
    groupBy: 'file',
  },
};

// DOM Elements
const elements = {
  statusFilter: document.getElementById('filter-status'),
  tagFilter: document.getElementById('filter-tag'),
  groupBySelect: document.getElementById('groupby-select'),
  resolveAllBtn: document.getElementById('btn-resolve-all'),
  deleteResolvedBtn: document.getElementById('btn-delete-resolved'),
  annotationsList: document.getElementById('annotations-list'),
  statTotal: document.getElementById('stat-total'),
  statResolved: document.getElementById('stat-resolved'),
  statUnresolved: document.getElementById('stat-unresolved'),
};

// ==================== Handlers ====================
class AnnotationHandlers {
  constructor(vscodeApi, state) {
    this.vscode = vscodeApi;
    this.state = state;
  }

  handleNavigate(annotation) {
    this.vscode.postMessage({
      command: 'navigate',
      annotation: annotation,
    });
  }

  handleToggleResolved(id) {
    this.vscode.postMessage({
      command: 'toggleResolved',
      id: id,
    });
  }

  handleDelete(id) {
    this.vscode.postMessage({
      command: 'delete',
      id: id,
    });
  }

  handleEdit(annotation) {
    this.vscode.postMessage({
      command: 'edit',
      annotation: annotation,
    });
  }

  handleResolveAll() {
    this.vscode.postMessage({
      command: 'resolveAll',
    });
  }

  handleDeleteResolved() {
    this.vscode.postMessage({
      command: 'deleteResolved',
    });
  }

  handleRefresh() {
    this.vscode.postMessage({
      command: 'requestAnnotations',
    });
  }

  handleAddTagPrompt(annotation) {
    // Available tags
    const availableTags = [
      'bug', 'performance', 'security', 'style',
      'improvement', 'docs', 'question', 'ai-review'
    ];

    // Get current tags
    const currentTags = annotation.tags?.map((t) => (typeof t === 'string' ? t : t.id)) || [];
    const filteredTags = availableTags.filter((tag) => !currentTags.includes(tag));

    if (filteredTags.length === 0) {
      // All tags already added - no action needed
      return;
    }

    // Show tag picker modal
    showTagPicker(annotation, filteredTags, (tag) => {
      this.handleAddTag(annotation.id, tag);
    });
  }

  handleAddTag(annotationId, tag) {
    this.vscode.postMessage({
      command: 'addTag',
      id: annotationId,
      tag: tag,
    });
  }

  handleRemoveTag(annotationId, tag) {
    this.vscode.postMessage({
      command: 'removeTag',
      id: annotationId,
      tag: tag,
    });
  }

  attachCardHandlers(annotation) {
    const card = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (!card) return;

    const gotoBtn = card.querySelector('[data-action="navigate"]');
    if (gotoBtn) {
      gotoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleNavigate(annotation);
      });
    }

    const toggleBtn = card.querySelector('[data-action="toggle"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleToggleResolved(annotation.id);
      });
    }

    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDelete(annotation.id);
      });
    }

    // Add tag button
    const addTagBtn = card.querySelector('[data-action="addTag"]');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAddTagPrompt(annotation);
      });
    }

    // Remove tag buttons
    const removeTagBtns = card.querySelectorAll('[data-action="removeTag"]');
    removeTagBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.dataset.tag;
        this.handleRemoveTag(annotation.id, tag);
      });
    });

    // Make entire card clickable to navigate
    card.addEventListener('click', (e) => {
      // Only navigate if not clicking on action buttons or tags
      if (!e.target.closest('.card-action-btn') && !e.target.closest('.tag-remove') && !e.target.closest('.tag-add')) {
        this.handleNavigate(annotation);
      }
    });
  }

  attachAllCardHandlers(annotations) {
    annotations.forEach((ann) => this.attachCardHandlers(ann));
  }
}

// ==================== Filtering ====================
function filterAnnotations(annotations, filters) {
  return annotations.filter((ann) => {
    if (filters.status === 'resolved' && !ann.resolved) {
      return false;
    }
    if (filters.status === 'unresolved' && ann.resolved) {
      return false;
    }

    if (filters.tag && filters.tag !== 'all') {
      const hasTag = ann.tags?.some((t) => {
        const tagId = typeof t === 'string' ? t : t.id;
        return tagId === filters.tag;
      });
      if (!hasTag) {
        return false;
      }
    }

    return true;
  });
}

function extractTags(annotations) {
  const tags = new Set();
  annotations.forEach((ann) => {
    if (ann.tags && Array.isArray(ann.tags)) {
      ann.tags.forEach((t) => {
        const tagId = typeof t === 'string' ? t : t.id;
        tags.add(tagId);
      });
    }
  });
  return Array.from(tags).sort();
}

function calculateStats(annotations) {
  const resolved = annotations.filter((a) => a.resolved).length;
  return {
    total: annotations.length,
    resolved,
    unresolved: annotations.length - resolved,
  };
}

function updateTagFilter(filterElement, tags, currentValue) {
  const currentTag = filterElement.value;
  filterElement.innerHTML = '<option value="all">All Tags</option>';

  tags.forEach((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    filterElement.appendChild(option);
  });

  if (currentTag && tags.includes(currentTag)) {
    filterElement.value = currentTag;
  } else {
    filterElement.value = 'all';
  }
}

// ==================== Rendering ====================
function createAnnotationCard(annotation) {
  const card = document.createElement('div');
  card.className = 'annotation-card';
  if (annotation.resolved) {
    card.classList.add('resolved');
  }

  card.dataset.annotationId = annotation.id;

  const header = document.createElement('div');
  header.className = 'card-header';

  const filePath = document.createElement('div');
  filePath.className = 'card-file';
  filePath.textContent = annotation.filePath.split(/[\\/]/).pop() || annotation.filePath;
  filePath.title = annotation.filePath;

  const statusBadge = document.createElement('div');
  statusBadge.className = `card-status ${annotation.resolved ? 'resolved' : 'unresolved'}`;
  statusBadge.textContent = annotation.resolved ? 'Resolved' : 'Unresolved';

  header.appendChild(filePath);
  header.appendChild(statusBadge);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'card-body';

  const comment = document.createElement('div');
  comment.className = 'card-comment';
  comment.textContent = annotation.comment;
  body.appendChild(comment);

  card.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'card-tags';

  if (annotation.tags && annotation.tags.length > 0) {
    annotation.tags.forEach((tag) => {
      const tagId = typeof tag === 'string' ? tag : tag.id;
      const tagEl = document.createElement('span');
      tagEl.className = `tag tag-${tagId}`;
      tagEl.textContent = tagId;

      // Add remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-remove';
      removeBtn.innerHTML = '<i class="codicon codicon-close"></i>';
      removeBtn.title = `Remove ${tagId} tag`;
      removeBtn.dataset.action = 'removeTag';
      removeBtn.dataset.annotationId = annotation.id;
      removeBtn.dataset.tag = tagId;

      tagEl.appendChild(removeBtn);
      tagsContainer.appendChild(tagEl);
    });
  }

  // Add "+" button to add tags
  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'tag tag-add';
  addTagBtn.innerHTML = '<i class="codicon codicon-add"></i> Tag';
  addTagBtn.title = 'Add tag';
  addTagBtn.dataset.action = 'addTag';
  addTagBtn.dataset.annotationId = annotation.id;
  tagsContainer.appendChild(addTagBtn);

  footer.appendChild(tagsContainer);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const gotoBtn = document.createElement('button');
  gotoBtn.className = 'card-action-btn';
  gotoBtn.innerHTML = '<i class="codicon codicon-arrow-right"></i>';
  gotoBtn.title = 'Go to annotation';
  gotoBtn.dataset.action = 'navigate';
  gotoBtn.dataset.annotationId = annotation.id;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'card-action-btn';
  toggleBtn.innerHTML = annotation.resolved
    ? '<i class="codicon codicon-debug-restart"></i>'
    : '<i class="codicon codicon-check"></i>';
  toggleBtn.title = annotation.resolved ? 'Mark as unresolved' : 'Mark as resolved';
  toggleBtn.dataset.action = 'toggle';
  toggleBtn.dataset.annotationId = annotation.id;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-action-btn';
  deleteBtn.innerHTML = '<i class="codicon codicon-trash"></i>';
  deleteBtn.title = 'Delete annotation';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.annotationId = annotation.id;

  actions.appendChild(gotoBtn);
  actions.appendChild(toggleBtn);
  actions.appendChild(deleteBtn);

  footer.appendChild(actions);
  card.appendChild(footer);

  return card;
}

function createGroupHeader(groupName) {
  const header = document.createElement('div');
  header.className = 'group-header';
  header.textContent = groupName;
  return header;
}

function groupAnnotations(annotations, groupBy) {
  const groups = {};

  annotations.forEach((ann) => {
    let key = 'Default';

    if (groupBy === 'file') {
      key = ann.filePath.split(/[\\/]/).pop() || 'Unnamed File';
    } else if (groupBy === 'folder') {
      const parts = ann.filePath.split(/[\\/]/);
      key = parts.length > 1 ? parts[parts.length - 2] : 'Root';
    } else if (groupBy === 'tag') {
      if (ann.tags && ann.tags.length > 0) {
        const tagId = typeof ann.tags[0] === 'string' ? ann.tags[0] : ann.tags[0].id;
        key = tagId;
      } else {
        key = 'Untagged';
      }
    } else if (groupBy === 'status') {
      key = ann.resolved ? 'Resolved' : 'Unresolved';
    } else if (groupBy === 'priority') {
      key = ann.priority || 'Default';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(ann);
  });

  return groups;
}

function renderAnnotationsList(container, annotations, groupBy) {
  if (!container) return;

  if (annotations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="codicon codicon-note empty-icon"></i>
        <h3 class="empty-title">No Annotations</h3>
        <p class="empty-text">
          Select code and press <code>Ctrl+Shift+A</code> to add an annotation
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  const grouped = groupAnnotations(annotations, groupBy);
  const sortedGroups = Object.keys(grouped).sort();

  sortedGroups.forEach((groupName) => {
    const items = grouped[groupName];

    if (groupBy !== 'none' && groupName !== '') {
      container.appendChild(createGroupHeader(groupName));
    }

    items.forEach((ann) => {
      container.appendChild(createAnnotationCard(ann));
    });
  });
}

// ==================== Initialization ====================
function init() {
  try {
    if (!elements.annotationsList) {
      console.error('[Annotative] Critical: annotations-list container not found');
      console.error('[Annotative] Available elements:', {
        statusFilter: !!elements.statusFilter,
        tagFilter: !!elements.tagFilter,
        groupBySelect: !!elements.groupBySelect,
        annotationsList: !!elements.annotationsList,
        resolveAllBtn: !!elements.resolveAllBtn,
        deleteResolvedBtn: !!elements.deleteResolvedBtn
      });
      return;
    }

    // Ensure tag picker modal is hidden on startup
    const tagPickerModal = document.getElementById('tag-picker-modal');
    if (tagPickerModal) {
      tagPickerModal.style.display = 'none';
      console.log('[Annotative] Tag picker modal initialized as hidden');
    }

    setupEventListeners();
    setupMessageHandlers();
    requestAnnotations();
    console.log('[Annotative] Webview initialized successfully');
  } catch (error) {
    console.error('[Annotative] Initialization error:', error);
  }
}

// Verify webview script loaded successfully
window.addEventListener('load', () => {
  if (document.readyState === 'complete') {
    console.log('[Annotative] Webview script loaded successfully');
  }
});

function setupEventListeners() {
  if (!elements.statusFilter) {
    console.warn('[Annotative] filter-status element not found');
  }
  elements.statusFilter?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    applyFiltersAndRender();
  });

  if (!elements.tagFilter) {
    console.warn('[Annotative] filter-tag element not found');
  }
  elements.tagFilter?.addEventListener('change', (e) => {
    state.filters.tag = e.target.value;
    applyFiltersAndRender();
  });

  if (!elements.groupBySelect) {
    console.warn('[Annotative] groupby-select element not found');
  }
  elements.groupBySelect?.addEventListener('change', (e) => {
    state.filters.groupBy = e.target.value;
    applyFiltersAndRender();
  });

  if (!elements.resolveAllBtn) {
    console.warn('[Annotative] btn-resolve-all element not found');
  }
  elements.resolveAllBtn?.addEventListener('click', () => {
    handlers.handleResolveAll();
  });

  if (!elements.deleteResolvedBtn) {
    console.warn('[Annotative] btn-delete-resolved element not found');
  }
  elements.deleteResolvedBtn?.addEventListener('click', () => {
    handlers.handleDeleteResolved();
  });
}

function setupMessageHandlers() {
  window.addEventListener('message', (event) => {
    try {
      const message = event.data;
      if (!message || !message.command) {
        console.warn('[Annotative] Invalid message received:', message);
        return;
      }
      handleExtensionMessage(message);
    } catch (error) {
      console.error('[Annotative] Error handling message:', error);
    }
  });
}

function handleExtensionMessage(message) {
  try {
    switch (message.command) {
      case 'updateAnnotations':
        handleUpdateAnnotations(message.annotations || []);
        break;
      case 'tagsUpdated':
        handleTagsUpdated(message.tags || []);
        break;
      case 'annotationAdded':
        handleAnnotationAdded(message.annotation);
        break;
      case 'annotationRemoved':
        handleAnnotationRemoved(message.id);
        break;
      case 'annotationUpdated':
        handleAnnotationUpdated(message.annotation);
        break;
      default:
        console.warn('[Annotative] Unknown command:', message.command);
    }
  } catch (error) {
    console.error('[Annotative] Error handling extension message:', error);
  }
}

function requestAnnotations() {
  vscode.postMessage({
    command: 'requestAnnotations',
  });
}

function handleUpdateAnnotations(annotations) {
  try {
    state.annotations = annotations || [];
    const tags = extractTags(state.annotations);
    updateTagFilter(elements.tagFilter, tags, state.filters.tag);
    applyFiltersAndRender();
  } catch (error) {
    console.error('[Annotative] Error updating annotations:', error);
  }
}

function handleTagsUpdated(tags) {
  try {
    updateTagFilter(elements.tagFilter, tags, state.filters.tag);
  } catch (error) {
    console.error('[Annotative] Error updating tags:', error);
  }
}

function handleAnnotationAdded(annotation) {
  if (annotation) {
    state.annotations.push(annotation);
    applyFiltersAndRender();
  }
}

function handleAnnotationRemoved(id) {
  state.annotations = state.annotations.filter((a) => a.id !== id);
  applyFiltersAndRender();
}

function handleAnnotationUpdated(annotation) {
  const index = state.annotations.findIndex((a) => a.id === annotation.id);
  if (index >= 0) {
    state.annotations[index] = annotation;
    applyFiltersAndRender();
  }
}

function applyFiltersAndRender() {
  try {
    const filtered = filterAnnotations(state.annotations, state.filters);
    renderAnnotationsList(elements.annotationsList, filtered, state.filters.groupBy);
    handlers.attachAllCardHandlers(filtered);
    updateStatistics(state.annotations);
  } catch (error) {
    console.error('[Annotative] Error applying filters and rendering:', error);
  }
}

function updateStatistics(annotations) {
  try {
    const stats = calculateStats(annotations);
    if (elements.statTotal) {
      elements.statTotal.textContent = stats.total;
    }
    if (elements.statResolved) {
      elements.statResolved.textContent = stats.resolved;
    }
    if (elements.statUnresolved) {
      elements.statUnresolved.textContent = stats.unresolved;
    }
  } catch (error) {
    console.error('[Annotative] Error updating statistics:', error);
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ==================== Tag Picker Modal ====================
function showTagPicker(annotation, availableTags, onSelect) {
  const modal = document.getElementById('tag-picker-modal');
  const list = document.getElementById('tag-picker-list');
  const closeBtn = document.getElementById('tag-picker-close');

  if (!modal || !list || !closeBtn) {
    console.error('[Annotative] Tag picker modal elements not found', {
      modal: !!modal,
      list: !!list,
      closeBtn: !!closeBtn
    });
    return;
  }

  // Clear previous items
  list.innerHTML = '';

  // Create tag picker items
  availableTags.forEach((tagId) => {
    const item = document.createElement('button');
    item.className = 'tag-picker-item';

    const tagEl = document.createElement('span');
    tagEl.className = `tag tag-${tagId}`;
    tagEl.textContent = tagId;

    item.appendChild(tagEl);
    item.addEventListener('click', () => {
      onSelect(tagId);
      hideTagPicker();
    });

    list.appendChild(item);
  });

  // Show modal
  modal.style.display = 'flex';
  console.log('[Annotative] Tag picker modal shown');

  // Close button handler - remove previous handlers first
  if (modal._closeHandler) {
    closeBtn.removeEventListener('click', modal._closeHandler);
  }

  const closeHandler = () => {
    hideTagPicker();
  };

  closeBtn.addEventListener('click', closeHandler);

  // Overlay click handler - remove previous handlers first
  if (modal._overlayHandler) {
    modal.removeEventListener('click', modal._overlayHandler);
  }

  const overlayHandler = (e) => {
    if (e.target === modal) {
      hideTagPicker();
    }
  };

  modal.addEventListener('click', overlayHandler);

  // Store handlers for cleanup
  modal._closeHandler = closeHandler;
  modal._overlayHandler = overlayHandler;
}

function hideTagPicker() {
  const modal = document.getElementById('tag-picker-modal');
  if (modal) {
    modal.style.display = 'none';
    console.log('[Annotative] Tag picker modal hidden');
  }
}

// Handlers instance
const handlers = new AnnotationHandlers(vscode, state);

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded (for cached/preloaded content)
  init();
}
