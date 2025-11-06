import { AnnotationTag, TagRegistry as ITagRegistry } from '../types';

/**
 * Manages preset and custom tag storage
 * Separated from tag operations for single responsibility
 */
export class TagRegistryStore {
    private registry: ITagRegistry;
    private readonly DEFAULT_TAG_COLORS: { [key: string]: string } = {
        bug: '#FF5252',
        security: '#D32F2F',
        performance: '#FFA726',
        accessibility: '#29B6F5',
        todo: '#66BB6A',
        refactor: '#AB47BC',
        test: '#EC407A',
        doc: '#42A5F5',
        'ai-review': '#00ACC1',
        'best-practice': '#26A69A',
        warning: '#FF7043',
        optimization: '#7E57C2',
        'breaking-change': '#EF5350',
        deprecated: '#90A4AE',
        note: '#78909C',
    };

    constructor() {
        this.registry = {
            presetTags: new Map(),
            customTags: new Map(),
        };
        this.initializePresetTags();
    }

    /**
     * Initialize built-in preset tags
     */
    private initializePresetTags(): void {
        const presets: { [key: string]: AnnotationTag } = {
            // Issue tags
            bug: {
                id: 'bug',
                name: 'Bug',
                category: 'issue',
                isPreset: true,
                metadata: {
                    priority: 'high',
                    color: this.DEFAULT_TAG_COLORS.bug,
                    icon: '$(bug)',
                    description: 'Critical issues or failures',
                },
            },
            security: {
                id: 'security',
                name: 'Security',
                category: 'issue',
                isPreset: true,
                metadata: {
                    priority: 'critical',
                    color: this.DEFAULT_TAG_COLORS.security,
                    icon: '$(shield)',
                    description: 'Security vulnerabilities',
                },
            },
            performance: {
                id: 'performance',
                name: 'Performance',
                category: 'issue',
                isPreset: true,
                metadata: {
                    priority: 'medium',
                    color: this.DEFAULT_TAG_COLORS.performance,
                    icon: '$(zap)',
                    description: 'Performance concerns',
                },
            },
            accessibility: {
                id: 'accessibility',
                name: 'Accessibility',
                category: 'issue',
                isPreset: true,
                metadata: {
                    priority: 'high',
                    color: this.DEFAULT_TAG_COLORS.accessibility,
                    icon: '$(eye)',
                    description: 'Accessibility issues',
                },
            },

            // Action tags
            todo: {
                id: 'todo',
                name: 'Todo',
                category: 'action',
                isPreset: true,
                metadata: {
                    priority: 'medium',
                    color: this.DEFAULT_TAG_COLORS.todo,
                    icon: '$(checklist)',
                    description: 'Action items',
                },
            },
            refactor: {
                id: 'refactor',
                name: 'Refactor',
                category: 'action',
                isPreset: true,
                metadata: {
                    priority: 'low',
                    color: this.DEFAULT_TAG_COLORS.refactor,
                    icon: '$(tools)',
                    description: 'Refactoring needed',
                },
            },
            test: {
                id: 'test',
                name: 'Test',
                category: 'action',
                isPreset: true,
                metadata: {
                    priority: 'medium',
                    color: this.DEFAULT_TAG_COLORS.test,
                    icon: '$(beaker)',
                    description: 'Testing needed',
                },
            },
            doc: {
                id: 'doc',
                name: 'Documentation',
                category: 'action',
                isPreset: true,
                metadata: {
                    priority: 'low',
                    color: this.DEFAULT_TAG_COLORS.doc,
                    icon: '$(file-text)',
                    description: 'Documentation needed',
                },
            },

            // Reference tags
            'ai-review': {
                id: 'ai-review',
                name: 'AI Review',
                category: 'reference',
                isPreset: true,
                metadata: {
                    priority: 'high',
                    color: this.DEFAULT_TAG_COLORS['ai-review'],
                    icon: '$(sparkle)',
                    description: 'AI-generated code requiring review',
                },
            },
            'best-practice': {
                id: 'best-practice',
                name: 'Best Practice',
                category: 'reference',
                isPreset: true,
                metadata: {
                    priority: 'low',
                    color: this.DEFAULT_TAG_COLORS['best-practice'],
                    icon: '$(star)',
                    description: 'Best practice reference',
                },
            },
            warning: {
                id: 'warning',
                name: 'Warning',
                category: 'reference',
                isPreset: true,
                metadata: {
                    priority: 'high',
                    color: this.DEFAULT_TAG_COLORS.warning,
                    icon: '$(warning)',
                    description: 'Warnings or cautions',
                },
            },
            optimization: {
                id: 'optimization',
                name: 'Optimization',
                category: 'reference',
                isPreset: true,
                metadata: {
                    priority: 'low',
                    color: this.DEFAULT_TAG_COLORS.optimization,
                    icon: '$(rocket)',
                    description: 'Optimization opportunities',
                },
            },

            // Meta tags
            'breaking-change': {
                id: 'breaking-change',
                name: 'Breaking Change',
                category: 'meta',
                isPreset: true,
                metadata: {
                    priority: 'critical',
                    color: this.DEFAULT_TAG_COLORS['breaking-change'],
                    icon: '$(alert)',
                    description: 'API or contract changes',
                },
            },
            deprecated: {
                id: 'deprecated',
                name: 'Deprecated',
                category: 'meta',
                isPreset: true,
                metadata: {
                    priority: 'medium',
                    color: this.DEFAULT_TAG_COLORS.deprecated,
                    icon: '$(trash)',
                    description: 'Deprecated patterns',
                },
            },
            note: {
                id: 'note',
                name: 'Note',
                category: 'meta',
                isPreset: true,
                metadata: {
                    priority: 'low',
                    color: this.DEFAULT_TAG_COLORS.note,
                    icon: '$(note)',
                    description: 'General notes',
                },
            },
        };

        Object.entries(presets).forEach(([key, tag]) => {
            this.registry.presetTags.set(key, tag);
        });
    }

    /**
     * Get a tag by ID (checks both preset and custom)
     */
    getTag(id: string): AnnotationTag | undefined {
        return this.registry.presetTags.get(id) || this.registry.customTags.get(id);
    }

    /**
     * Get all preset tags
     */
    getPresetTags(): AnnotationTag[] {
        return Array.from(this.registry.presetTags.values());
    }

    /**
     * Get all custom tags
     */
    getCustomTags(): AnnotationTag[] {
        return Array.from(this.registry.customTags.values());
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
     * Get default color for a tag
     */
    getDefaultColor(tagId: string): string {
        const tag = this.getTag(tagId);
        if (tag?.metadata?.color) {
            return tag.metadata.color;
        }
        return this.DEFAULT_TAG_COLORS[tagId] || '#9E9E9E';
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
}
