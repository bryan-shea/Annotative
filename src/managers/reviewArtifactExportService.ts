import {
    ReviewAnnotation,
    ReviewArtifact,
    ReviewArtifactDiffFile,
    ReviewArtifactDiffHunk,
    ReviewArtifactMetadata,
    ReviewArtifactSection,
} from '../types';

export type ReviewArtifactExportLanguage = 'markdown' | 'text' | 'json';

export interface ReviewArtifactExportResult {
    adapterId: string;
    content: string;
    language: ReviewArtifactExportLanguage;
    fileExtension: string;
}

export interface ReviewArtifactExportAdapter {
    readonly id: string;
    readonly label: string;
    readonly language: ReviewArtifactExportLanguage;
    readonly fileExtension: string;
    supports(artifact: ReviewArtifact): boolean;
    export(artifact: ReviewArtifact): Promise<string> | string;
}

export class GenericMarkdownReviewArtifactExportAdapter implements ReviewArtifactExportAdapter {
    readonly id = 'genericMarkdown';
    readonly label = 'Generic Markdown';
    readonly language = 'markdown' as const;
    readonly fileExtension = 'md';

    supports(): boolean {
        return true;
    }

    export(artifact: ReviewArtifact): string {
        const lines: string[] = [];

        lines.push(`# Review Artifact: ${artifact.title}`);
        lines.push('');
        lines.push(`- Artifact ID: ${artifact.id}`);
        lines.push(`- Kind: ${artifact.kind}`);
        lines.push(`- Version: ${artifact.version}`);
        lines.push(`- Created At: ${artifact.createdAt}`);
        lines.push(`- Updated At: ${artifact.updatedAt}`);
        lines.push(`- Source Type: ${artifact.source.type}`);

        if (artifact.source.uri) {
            lines.push(`- Source URI: ${artifact.source.uri}`);
        }

        if (artifact.source.workspaceFolder) {
            lines.push(`- Workspace Folder: ${artifact.source.workspaceFolder}`);
        }

        if (artifact.source.revision) {
            lines.push(`- Revision: ${artifact.source.revision}`);
        }

        this.appendMetadata(lines, 'Source Metadata', artifact.source.metadata);
        this.appendMetadata(lines, 'Content Metadata', artifact.content.metadata);

        if (artifact.content.sections && artifact.content.sections.length > 0) {
            lines.push('');
            lines.push('## Sections');
            lines.push('');

            const sections = [...artifact.content.sections].sort((left, right) => {
                if (left.order !== right.order) {
                    return left.order - right.order;
                }

                return left.id.localeCompare(right.id);
            });

            sections.forEach((section, index) => {
                this.appendSection(lines, section, index + 1);
            });
        }

        if (artifact.content.diffFiles && artifact.content.diffFiles.length > 0) {
            lines.push('');
            lines.push('## Diff Files');
            lines.push('');

            const diffFiles = [...artifact.content.diffFiles].sort((left, right) => {
                const leftPath = `${left.newPath}|${left.oldPath}`;
                const rightPath = `${right.newPath}|${right.oldPath}`;
                return leftPath.localeCompare(rightPath);
            });

            diffFiles.forEach((diffFile, index) => {
                this.appendDiffFile(lines, diffFile, index + 1);
            });
        }

        if (artifact.content.rawText.trim().length > 0) {
            lines.push('');
            lines.push('## Raw Content');
            lines.push('');
            lines.push('```text');
            lines.push(artifact.content.rawText);
            lines.push('```');
        }

        lines.push('');
        lines.push('## Annotations');
        lines.push('');

        if (artifact.annotations.length === 0) {
            lines.push('No annotations.');
        } else {
            const annotations = [...artifact.annotations].sort((left, right) => {
                if (left.createdAt !== right.createdAt) {
                    return left.createdAt.localeCompare(right.createdAt);
                }

                return left.id.localeCompare(right.id);
            });

            annotations.forEach((annotation, index) => {
                this.appendAnnotation(lines, annotation, index + 1);
            });
        }

        return `${lines.join('\n').trimEnd()}\n`;
    }

    private appendSection(lines: string[], section: ReviewArtifactSection, index: number): void {
        lines.push(`### ${index}. ${section.heading || section.id}`);
        lines.push(`- Section ID: ${section.id}`);
        lines.push(`- Level: ${section.level}`);
        lines.push(`- Order: ${section.order}`);

        if (typeof section.lineStart === 'number' && typeof section.lineEnd === 'number') {
            lines.push(`- Lines: ${section.lineStart}-${section.lineEnd}`);
        }

        this.appendMetadata(lines, 'Section Metadata', section.metadata);
        lines.push('');
        lines.push('```text');
        lines.push(section.content);
        lines.push('```');
        lines.push('');
    }

    private appendDiffFile(lines: string[], diffFile: ReviewArtifactDiffFile, index: number): void {
        lines.push(`### ${index}. ${diffFile.newPath}`);
        lines.push(`- Diff File ID: ${diffFile.id}`);
        lines.push(`- Status: ${diffFile.status}`);
        lines.push(`- Old Path: ${diffFile.oldPath}`);
        lines.push(`- New Path: ${diffFile.newPath}`);
        this.appendMetadata(lines, 'Diff File Metadata', diffFile.metadata);
        lines.push('');

        diffFile.hunks.forEach((hunk, indexInFile) => {
            this.appendDiffHunk(lines, hunk, indexInFile + 1);
        });
    }

    private appendDiffHunk(lines: string[], hunk: ReviewArtifactDiffHunk, index: number): void {
        lines.push(`#### Hunk ${index}`);
        lines.push(`- Hunk ID: ${hunk.id}`);
        lines.push(`- Header: ${hunk.header}`);
        lines.push(`- Old Range: ${hunk.oldStart},${hunk.oldLines}`);
        lines.push(`- New Range: ${hunk.newStart},${hunk.newLines}`);
        lines.push('');
        lines.push('```diff');
        lines.push(hunk.header);

        hunk.lines.forEach(line => {
            const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
            lines.push(`${prefix}${line.content}`);
        });

        lines.push('```');
        lines.push('');
    }

    private appendAnnotation(lines: string[], annotation: ReviewAnnotation, index: number): void {
        lines.push(`### ${index}. ${annotation.kind} [${annotation.status}]`);
        lines.push(`- Annotation ID: ${annotation.id}`);
        lines.push(`- Target: ${this.formatTarget(annotation)}`);
        lines.push(`- Created At: ${annotation.createdAt}`);
        lines.push(`- Updated At: ${annotation.updatedAt}`);

        if (annotation.severity) {
            lines.push(`- Severity: ${annotation.severity}`);
        }

        this.appendMetadata(lines, 'Annotation Metadata', annotation.metadata);
        lines.push('');
        lines.push(annotation.body);

        if (annotation.suggestedReplacement) {
            lines.push('');
            lines.push('Suggested replacement:');
            lines.push('```text');
            lines.push(annotation.suggestedReplacement);
            lines.push('```');
        }

        lines.push('');
    }

    private appendMetadata(lines: string[], heading: string, metadata: ReviewArtifactMetadata | undefined): void {
        if (!metadata || Object.keys(metadata).length === 0) {
            return;
        }

        lines.push('');
        lines.push(`### ${heading}`);

        Object.entries(metadata)
            .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
            .forEach(([key, value]) => {
                lines.push(`- ${key}: ${value}`);
            });
    }

    private formatTarget(annotation: ReviewAnnotation): string {
        const { target } = annotation;

        switch (target.type) {
            case 'section':
                return target.sectionId ? `section:${target.sectionId}` : 'section';
            case 'diffFile':
                return target.diffFileId ? `diffFile:${target.diffFileId}` : 'diffFile';
            case 'diffHunk':
                return target.diffHunkId ? `diffHunk:${target.diffHunkId}` : 'diffHunk';
            case 'lineRange': {
                const start = typeof target.lineStart === 'number' ? target.lineStart : '?';
                const end = typeof target.lineEnd === 'number' ? target.lineEnd : '?';
                return `${target.type}:${start}-${end}`;
            }
            case 'artifact':
            default:
                return target.type;
        }
    }
}

export class ReviewArtifactExportService {
    private adapters = new Map<string, ReviewArtifactExportAdapter>();

    constructor(adapters: ReviewArtifactExportAdapter[] = [new GenericMarkdownReviewArtifactExportAdapter()]) {
        adapters.forEach(adapter => this.registerAdapter(adapter));
    }

    registerAdapter(adapter: ReviewArtifactExportAdapter): void {
        this.adapters.set(adapter.id, adapter);
    }

    getAdapters(): ReviewArtifactExportAdapter[] {
        return Array.from(this.adapters.values());
    }

    getAdapter(adapterId: string): ReviewArtifactExportAdapter | undefined {
        return this.adapters.get(adapterId);
    }

    async exportArtifact(
        artifact: ReviewArtifact,
        adapterId = 'genericMarkdown'
    ): Promise<ReviewArtifactExportResult> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            throw new Error(`Unknown review artifact export adapter: ${adapterId}`);
        }

        if (!adapter.supports(artifact)) {
            throw new Error(`Review artifact export adapter ${adapterId} does not support ${artifact.kind}`);
        }

        return {
            adapterId: adapter.id,
            content: await adapter.export(artifact),
            language: adapter.language,
            fileExtension: adapter.fileExtension,
        };
    }
}