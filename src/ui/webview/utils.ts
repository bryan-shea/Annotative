/**
 * Webview Utilities
 * Shared helper functions for filtering, grouping, and formatting
 */

import { Annotation } from '../../types';
import { FilterState, GroupedAnnotations, AnnotationStats } from './types';

/**
 * Debounce utility for input handlers
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Filter annotations based on current filter state
 */
export function filterAnnotations(
  annotations: Annotation[],
  filters: FilterState
): Annotation[] {
  return annotations.filter((ann) => {
    // Filter by status
    if (filters.status === 'resolved' && !ann.resolved) {
      return false;
    }
    if (filters.status === 'unresolved' && ann.resolved) {
      return false;
    }

    // Filter by tag
    if (filters.tag && filters.tag !== 'all') {
      const hasTag = ann.tags?.some((t) => {
        const tagId = typeof t === 'string' ? t : t.id;
        return tagId === filters.tag;
      });
      if (!hasTag) {
        return false;
      }
    }

    // Filter by search text
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

/**
 * Group annotations by specified criteria
 */
export function groupAnnotations(
  annotations: Annotation[],
  groupBy: FilterState['groupBy']
): GroupedAnnotations {
  const groups: GroupedAnnotations = {};

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

/**
 * Calculate statistics for annotations
 */
export function calculateStats(annotations: Annotation[]): AnnotationStats {
  const resolved = annotations.filter((a) => a.resolved).length;
  return {
    total: annotations.length,
    resolved,
    unresolved: annotations.length - resolved,
  };
}

/**
 * Extract unique tag names from annotations
 */
export function extractTags(annotations: Annotation[]): string[] {
  const tags = new Set<string>();
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

/**
 * Escape HTML special characters for safe rendering
 * Note: This function is implemented in webview JavaScript context
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format file path for display (show relative or filename only)
 */
export function formatFilePath(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

/**
 * Generate unique ID for HTML elements
 */
export function generateElementId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}
