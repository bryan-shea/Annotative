import { AnnotationTag, TagCategory, TagMetadata, TagSuggestion } from '../types';
import { TagRegistryStore } from './tagRegistry';
import { TagSuggestionEngine } from './tagSuggestions';
import { TagValidator } from './tagValidation';

/**
 * TagManager orchestrates tag operations
 * Delegates to specialized modules for specific responsibilities
 */
export class TagManager {
    private tagRegistry: TagRegistryStore;
    private suggestionEngine: TagSuggestionEngine;
    private validator: TagValidator;

    constructor() {
        this.tagRegistry = new TagRegistryStore();
        this.suggestionEngine = new TagSuggestionEngine(this.tagRegistry);
        this.validator = new TagValidator(this.tagRegistry);
    }

    /**
     * Get a tag by ID (checks both preset and custom)
     */
    getTag(id: string): AnnotationTag | undefined {
        return this.tagRegistry.getTag(id);
    }

    /**
     * Get all preset tags
     */
    getPresetTags(): AnnotationTag[] {
        return this.tagRegistry.getPresetTags();
    }

    /**
     * Get all custom tags
     */
    getCustomTags(): AnnotationTag[] {
        return this.tagRegistry.getCustomTags();
    }

    /**
     * Get tags by category
     */
    getTagsByCategory(category: TagCategory): AnnotationTag[] {
        return this.validator.getTagsByCategory(category);
    }

    /**
     * Create a new custom tag
     */
    createCustomTag(
        name: string,
        category: TagCategory,
        metadata?: TagMetadata
    ): AnnotationTag {
        return this.validator.createCustomTag(name, category, metadata);
    }

    /**
     * Update a custom tag
     */
    updateCustomTag(
        id: string,
        name?: string,
        metadata?: TagMetadata
    ): AnnotationTag | undefined {
        const tag = this.tagRegistry.getTag(id);
        if (!tag || tag.isPreset) {
            return undefined;
        }

        if (name) {
            tag.name = name;
        }
        if (metadata) {
            tag.metadata = { ...tag.metadata, ...metadata };
        }

        this.tagRegistry.updateCustomTag(id, tag);
        return tag;
    }

    /**
     * Delete a custom tag
     */
    deleteCustomTag(id: string): boolean {
        const tag = this.tagRegistry.getTag(id);
        if (tag?.isPreset) {
            return false; // Cannot delete preset tags
        }
        return this.tagRegistry.deleteCustomTag(id);
    }

    /**
     * Get tag suggestions based on comment text
     */
    suggestTagsFromComment(comment: string): TagSuggestion[] {
        return this.suggestionEngine.suggestTagsFromComment(comment);
    }

    /**
     * Normalize tags - convert strings to AnnotationTag objects if needed
     */
    normalizeTags(tags: (string | AnnotationTag)[] | undefined): AnnotationTag[] {
        return this.validator.normalizeTags(tags);
    }

    /**
     * Export custom tags for storage
     */
    exportCustomTags(): AnnotationTag[] {
        return this.tagRegistry.exportCustomTags();
    }

    /**
     * Import custom tags from storage
     */
    importCustomTags(tags: AnnotationTag[]): void {
        this.tagRegistry.importCustomTags(tags);
    }

    /**
     * Get default color for a tag
     */
    getTagColor(tagId: string): string {
        return this.tagRegistry.getDefaultColor(tagId);
    }

    /**
     * Get icon for a tag
     */
    getTagIcon(tagId: string): string {
        const tag = this.tagRegistry.getTag(tagId);
        return tag?.metadata?.icon || '$(tag)';
    }

    /**
     * Get priority for a tag
     */
    getTagPriority(tagId: string): string {
        const tag = this.tagRegistry.getTag(tagId);
        return tag?.metadata?.priority || 'medium';
    }
}
