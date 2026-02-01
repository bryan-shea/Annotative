import { AnnotationTag, TagRegistry as ITagRegistry } from '../types';

/**
 * Manages user-defined tag storage
 * No preset tags - users create their own tags per project
 */
export class TagRegistryStore {
    private registry: ITagRegistry;

    // Default color palette for new tags
    private readonly TAG_COLOR_PALETTE: string[] = [
        '#FF5252', // Red
        '#FFA726', // Orange
        '#FFEE58', // Yellow
        '#66BB6A', // Green
        '#42A5F5', // Blue
        '#AB47BC', // Purple
        '#26C6DA', // Cyan
        '#78909C', // Gray
    ];

    constructor() {
        this.registry = {
            presetTags: new Map(), // Empty - no presets
            customTags: new Map(),
        };
    }

    /**
     * Get a tag by ID
     */
    getTag(id: string): AnnotationTag | undefined {
        return this.registry.customTags.get(id);
    }

    /**
     * Get all preset tags (always empty - no presets)
     * @deprecated Presets removed - use getCustomTags()
     */
    getPresetTags(): AnnotationTag[] {
        return [];
    }

    /**
     * Get all custom (user-defined) tags
     */
    getCustomTags(): AnnotationTag[] {
        return Array.from(this.registry.customTags.values());
    }

    /**
     * Get all tags (same as getCustomTags since no presets exist)
     */
    getAllTags(): AnnotationTag[] {
        return this.getCustomTags();
    }

    /**
     * Add a custom tag to registry
     */
    addCustomTag(tag: AnnotationTag): void {
        this.registry.customTags.set(tag.id, tag);
    }

    /**
     * Update a custom tag in registry
     */
    updateCustomTag(id: string, updates: Partial<AnnotationTag>): void {
        const tag = this.registry.customTags.get(id);
        if (tag) {
            Object.assign(tag, updates);
        }
    }

    /**
     * Delete a custom tag from registry
     */
    deleteCustomTag(id: string): boolean {
        return this.registry.customTags.delete(id);
    }

    /**
     * Get a suggested color for a new tag (cycles through palette)
     */
    getSuggestedColor(): string {
        const existingColors = Array.from(this.registry.customTags.values())
            .map(t => t.metadata?.color)
            .filter(Boolean);

        // Find first unused color from palette
        for (const color of this.TAG_COLOR_PALETTE) {
            if (!existingColors.includes(color)) {
                return color;
            }
        }

        // All colors used, return a random one
        return this.TAG_COLOR_PALETTE[Math.floor(Math.random() * this.TAG_COLOR_PALETTE.length)];
    }

    /**
     * Get default color for a tag
     */
    getDefaultColor(tagId: string): string {
        const tag = this.getTag(tagId);
        if (tag?.metadata?.color) {
            return tag.metadata.color;
        }
        return '#9E9E9E'; // Default gray
    }

    /**
     * Export custom tags for storage
     */
    exportCustomTags(): AnnotationTag[] {
        return Array.from(this.registry.customTags.values());
    }

    /**
     * Import custom tags from storage
     */
    importCustomTags(tags: AnnotationTag[]): void {
        tags.forEach(tag => this.registry.customTags.set(tag.id, tag));
    }

    /**
     * Check if any tags exist
     */
    hasTags(): boolean {
        return this.registry.customTags.size > 0;
    }

    /**
     * Get tag count
     */
    getTagCount(): number {
        return this.registry.customTags.size;
    }

    /**
     * Clear all tags
     */
    clearAllTags(): void {
        this.registry.customTags.clear();
    }
}
