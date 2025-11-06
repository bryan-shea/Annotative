import { AnnotationTag, TagSuggestion } from '../types';
import { TagRegistryStore } from './tagRegistry';

/**
 * Tag suggestion engine
 * Analyzes comments and suggests relevant tags
 */
export class TagSuggestionEngine {
    private tagRegistry: TagRegistryStore;

    constructor(tagRegistry: TagRegistryStore) {
        this.tagRegistry = tagRegistry;
    }

    /**
     * Get tag suggestions based on comment text
     */
    suggestTagsFromComment(comment: string): TagSuggestion[] {
        const suggestions: TagSuggestion[] = [];
        const commentLower = comment.toLowerCase();

        const keywordMap: { [key: string]: string } = {
            bug: 'bug',
            error: 'bug',
            issue: 'bug',
            broken: 'bug',
            crash: 'bug',

            security: 'security',
            vulnerability: 'security',
            exploit: 'security',
            xss: 'security',
            injection: 'security',

            performance: 'performance',
            slow: 'performance',
            optimize: 'optimization',
            efficient: 'optimization',

            accessibility: 'accessibility',
            a11y: 'accessibility',
            wcag: 'accessibility',

            todo: 'todo',
            fixme: 'todo',
            hack: 'todo',

            refactor: 'refactor',
            cleanup: 'refactor',
            simplify: 'refactor',

            test: 'test',
            unit: 'test',
            integration: 'test',

            documentation: 'doc',
            docs: 'doc',
            comment: 'doc',

            deprecated: 'deprecated',
            obsolete: 'deprecated',

            'breaking change': 'breaking-change',
            'breaking-change': 'breaking-change',
        };

        Object.entries(keywordMap).forEach(([keyword, tagId]) => {
            if (commentLower.includes(keyword)) {
                const tag = this.tagRegistry.getTag(tagId);
                if (tag) {
                    suggestions.push({
                        tag,
                        confidence: 0.8,
                        reason: 'keyword',
                    });
                }
            }
        });

        // Remove duplicates (keep highest confidence)
        const uniqueSuggestions = new Map<string, TagSuggestion>();
        suggestions.forEach(suggestion => {
            const key = suggestion.tag.id;
            if (!uniqueSuggestions.has(key) || suggestion.confidence > uniqueSuggestions.get(key)!.confidence) {
                uniqueSuggestions.set(key, suggestion);
            }
        });

        return Array.from(uniqueSuggestions.values());
    }
}
