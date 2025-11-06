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
    search: '',
    groupBy: 'file',
  },
};

// DOM Elements
const elements = {
  statusFilter: document.getElementById('filter-status'),
  tagFilter: document.getElementById('filter-tag'),
  searchInput: document.getElementById('search-input'),
  groupBySelect: document.getElementById('groupby-select'),
  clearSearchBtn: document.getElementById('btn-clear-search'),
  refreshBtn: document.getElementById('btn-refresh'),
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

    card.addEventListener('click', () => {
      // Could open detail panel in future
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

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchText = `${ann.comment} ${ann.filePath}`.toLowerCase();
      if (!searchText.includes(searchLower)) {
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
      tagsContainer.appendChild(tagEl);
    });
  }

  footer.appendChild(tagsContainer);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const gotoBtn = document.createElement('button');
  gotoBtn.className = 'card-action-btn';
  gotoBtn.textContent = 'goto';
  gotoBtn.title = 'Go to annotation';
  gotoBtn.dataset.action = 'navigate';
  gotoBtn.dataset.annotationId = annotation.id;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'card-action-btn';
  toggleBtn.textContent = annotation.resolved ? 'undo' : 'check';
  toggleBtn.title = annotation.resolved ? 'Mark as unresolved' : 'Mark as resolved';
  toggleBtn.dataset.action = 'toggle';
  toggleBtn.dataset.annotationId = annotation.id;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-action-btn';
  deleteBtn.textContent = 'delete';
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
        <div class="empty-icon">list_alt</div>
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
  setupEventListeners();
  setupMessageHandlers();
  requestAnnotations();
}

function setupEventListeners() {
  elements.statusFilter?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    applyFiltersAndRender();
  });

  elements.tagFilter?.addEventListener('change', (e) => {
    state.filters.tag = e.target.value;
    applyFiltersAndRender();
  });

  elements.groupBySelect?.addEventListener('change', (e) => {
    state.filters.groupBy = e.target.value;
    applyFiltersAndRender();
  });

  elements.searchInput?.addEventListener('input', debounce((e) => {
    state.filters.search = e.target.value;
    applyFiltersAndRender();
  }, 300));

  elements.clearSearchBtn?.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.filters.search = '';
    applyFiltersAndRender();
  });

  elements.refreshBtn?.addEventListener('click', () => {
    requestAnnotations();
  });

  elements.resolveAllBtn?.addEventListener('click', () => {
    handlers.handleResolveAll();
  });

  elements.deleteResolvedBtn?.addEventListener('click', () => {
    handlers.handleDeleteResolved();
  });
}

function setupMessageHandlers() {
  window.addEventListener('message', (event) => {
    const message = event.data;
    handleExtensionMessage(message);
  });
}

function handleExtensionMessage(message) {
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
  }
}

function requestAnnotations() {
  vscode.postMessage({
    command: 'requestAnnotations',
  });
}

function handleUpdateAnnotations(annotations) {
  state.annotations = annotations || [];

  const tags = extractTags(state.annotations);
  updateTagFilter(elements.tagFilter, tags, state.filters.tag);

  applyFiltersAndRender();
}

function handleTagsUpdated(tags) {
  updateTagFilter(elements.tagFilter, tags, state.filters.tag);
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
  const filtered = filterAnnotations(state.annotations, state.filters);
  renderAnnotationsList(elements.annotationsList, filtered, state.filters.groupBy);

  handlers.attachAllCardHandlers(filtered);

  updateStatistics(state.annotations);
}

function updateStatistics(annotations) {
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
}

function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Handlers instance
const handlers = new AnnotationHandlers(vscode, state);

// Start
document.addEventListener('DOMContentLoaded', init);
