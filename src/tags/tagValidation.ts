import { AnnotationTag, TagCategory, TagMetadata } from '../types';
import { TagRegistryStore } from './tagRegistry';

/**
 * Tag validation and creation utilities
 * Handles tag creation, validation, and normalization
 */
export class TagValidator {
    private tagRegistry: TagRegistryStore;

    constructor(tagRegistry: TagRegistryStore) {
        this.tagRegistry = tagRegistry;
    }

    /**
     * Create a new custom tag with validation
     */
    createCustomTag(
        name: string,
        category: TagCategory,
        metadata?: TagMetadata
    ): AnnotationTag {
        const id = this.generateId(name);

        if (this.tagRegistry.getTag(id)) {
            throw new Error(`Tag with id '${id}' already exists`);
        }

        const tag: AnnotationTag = {
            id,
            name,
            category,
            metadata,
            isPreset: false,
        };

        this.tagRegistry.addCustomTag(tag);
        return tag;
    }

    /**
     * Validate tag name
     */
    validateTagName(name: string): { valid: boolean; error?: string } {
        if (!name || name.trim().length === 0) {
            return { valid: false, error: 'Tag name cannot be empty' };
        }

        if (name.length > 50) {
            return { valid: false, error: 'Tag name must be 50 characters or less' };
        }

        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
            return { valid: false, error: 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores' };
        }

        return { valid: true };
    }

    /**
     * Normalize tags - convert strings to AnnotationTag objects if needed
     */
    normalizeTags(tags: (string | AnnotationTag)[] | undefined): AnnotationTag[] {
        if (!tags || tags.length === 0) {
            return [];
        }

        return tags.map(tag => {
            if (typeof tag === 'string') {
                // Try to find existing tag
                const existing = this.tagRegistry.getTag(tag);
                if (existing) {
                    return existing;
                }
                // Fallback: create a temporary reference
                return {
                    id: tag,
                    name: tag,
                    category: 'custom',
                    isPreset: false,
                };
            }
            return tag;
        });
    }

    /**
     * Get all tags by category
     */
    getTagsByCategory(category: TagCategory): AnnotationTag[] {
        const allTags = [
            ...this.tagRegistry.getPresetTags(),
            ...this.tagRegistry.getCustomTags(),
        ];
        return allTags.filter(tag => tag.category === category);
    }

    /**
     * Generate a valid tag ID from name
     */
    private generateId(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '');
    }
}
