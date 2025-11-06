import { Annotation } from '../../types';

export type FilterStatus = 'all' | 'unresolved' | 'resolved';
export type FilterTag = 'all' | string;

/**
 * Filters annotations based on status, tags, and search query
 */
export function filterAnnotations(
    annotations: Annotation[],
    filterStatus: FilterStatus,
    filterTag: FilterTag,
    searchQuery: string
): Annotation[] {
    return annotations.filter(annotation => {
        // Filter by status
        if (filterStatus === 'resolved' && !annotation.resolved) {
            return false;
        }
        if (filterStatus === 'unresolved' && annotation.resolved) {
            return false;
        }

        // Filter by tag
        if (filterTag !== 'all') {
            if (!annotation.tags) {
                return false;
            }
            const hasTag = annotation.tags.some(tag => {
                const tagId = typeof tag === 'string' ? tag : tag.id;
                return tagId === filterTag;
            });
            if (!hasTag) {
                return false;
            }
        }

        // Filter by search query
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const commentMatch = annotation.comment.toLowerCase().includes(searchLower);
            const textMatch = annotation.text.toLowerCase().includes(searchLower);
            const authorMatch = annotation.author.toLowerCase().includes(searchLower);
            const tagMatch = annotation.tags?.some(tag => {
                const tagName = typeof tag === 'string' ? tag : tag.name;
                return tagName.toLowerCase().includes(searchLower);
            });

            if (!commentMatch && !textMatch && !authorMatch && !tagMatch) {
                return false;
            }
        }

        return true;
    });
}
