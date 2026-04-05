import {
    ReviewAnnotation,
    ReviewArtifact,
    ReviewArtifactBlock,
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
    readonly description?: string;
    readonly language: ReviewArtifactExportLanguage;
    readonly fileExtension: string;
    supports(artifact: ReviewArtifact): boolean;
    export(artifact: ReviewArtifact): Promise<string> | string;
}

export class GenericMarkdownReviewArtifactExportAdapter implements ReviewArtifactExportAdapter {
    readonly id = 'genericMarkdown';
    readonly label = 'Generic Markdown';
    readonly description = 'Readable markdown export for human review and archival.';
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
                this.appendSection(lines, artifact, section, index + 1);
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

    private appendSection(lines: string[], artifact: ReviewArtifact, section: ReviewArtifactSection, index: number): void {
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

        const sectionBlocks = (artifact.content.blocks ?? []).filter(block => block.sectionId === section.id);
        if (sectionBlocks.length > 0) {
            lines.push('');
            lines.push('#### Blocks');
            lines.push('');

            sectionBlocks.forEach((block, blockIndex) => {
                this.appendBlock(lines, block, blockIndex + 1);
            });
        }

        lines.push('');
    }

    private appendBlock(lines: string[], block: ReviewArtifactBlock, index: number): void {
        lines.push(`##### ${index}. ${block.kind}`);
        lines.push(`- Block ID: ${block.id}`);
        lines.push(`- Order: ${block.order}`);

        if (typeof block.lineStart === 'number' && typeof block.lineEnd === 'number') {
            lines.push(`- Lines: ${block.lineStart}-${block.lineEnd}`);
        }

        this.appendMetadata(lines, 'Block Metadata', block.metadata);
        lines.push('');
        lines.push('```text');
        lines.push(block.content);
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
            case 'block':
                return target.blockId ? `block:${target.blockId}` : 'block';
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

export class CopilotReviewPromptReviewArtifactExportAdapter implements ReviewArtifactExportAdapter {
    readonly id = 'copilotReviewPrompt';
    readonly label = 'Copilot Review Prompt';
    readonly description = 'Structured follow-up export for Copilot-style coding agents.';
    readonly language = 'markdown' as const;
    readonly fileExtension = 'md';

    supports(): boolean {
        return true;
    }

    export(artifact: ReviewArtifact): string {
        const lines: string[] = [];
        const openAnnotations = sortAnnotations(artifact.annotations.filter(annotation => annotation.status === 'open'));
        const resolvedAnnotations = sortAnnotations(artifact.annotations.filter(annotation => annotation.status === 'resolved'));
        const groups = groupAnnotationsForCopilot(openAnnotations);
        const nextSteps = buildCopilotNextSteps(artifact, groups, openAnnotations);

        lines.push(`# Copilot Review Prompt: ${artifact.title}`);
        lines.push('');
        lines.push('Use this review context to revise the artifact or implementation before continuing.');
        lines.push('');
        lines.push('## Artifact Summary');
        lines.push('');
        lines.push(`- Artifact ID: ${artifact.id}`);
        lines.push(`- Kind: ${artifact.kind}`);
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

        lines.push(`- Open Annotations: ${openAnnotations.length}`);
        lines.push(`- Resolved Annotations: ${resolvedAnnotations.length}`);

        appendMetadataBulletList(lines, 'Source Metadata', artifact.source.metadata);
        appendMetadataBulletList(lines, 'Content Metadata', artifact.content.metadata);

        lines.push('');
        lines.push('## Review Context');
        lines.push('');
        appendReviewContext(lines, artifact);

        appendCopilotAnnotationSection(lines, 'Requested Changes', groups.requestedChanges, 'No requested changes were recorded.');
        appendCopilotAnnotationSection(lines, 'Missing Steps', groups.missingSteps, 'No missing steps were recorded.');
        appendCopilotAnnotationSection(lines, 'Risks Or Concerns', groups.risksOrConcerns, 'No risks or concerns were recorded.');
        appendCopilotAnnotationSection(lines, 'Open Questions', groups.openQuestions, 'No open questions were recorded.');
        appendCopilotAnnotationSection(lines, 'Additional Notes', groups.additionalNotes, 'No additional notes were recorded.');

        lines.push('');
        lines.push('## Next-Step Guidance');
        lines.push('');

        if (nextSteps.length === 0) {
            lines.push('1. No open feedback remains. Confirm the revision is ready and keep the export for traceability.');
        } else {
            nextSteps.forEach((step, index) => {
                lines.push(`${index + 1}. ${step}`);
            });
        }

        if (resolvedAnnotations.length > 0) {
            lines.push('');
            lines.push('## Resolved Feedback');
            lines.push('');

            resolvedAnnotations.forEach((annotation, index) => {
                appendCopilotAnnotation(lines, annotation, index + 1);
            });
        }

        return `${lines.join('\n').trimEnd()}\n`;
    }
}

export class ReviewArtifactExportService {
    private adapters = new Map<string, ReviewArtifactExportAdapter>();

    constructor(
        adapters: ReviewArtifactExportAdapter[] = [
            new GenericMarkdownReviewArtifactExportAdapter(),
            new CopilotReviewPromptReviewArtifactExportAdapter(),
        ]
    ) {
        adapters.forEach(adapter => this.registerAdapter(adapter));
    }

    registerAdapter(adapter: ReviewArtifactExportAdapter): void {
        this.adapters.set(adapter.id, adapter);
    }

    getAdapters(): ReviewArtifactExportAdapter[] {
        return Array.from(this.adapters.values());
    }

    getSupportedAdapters(artifact: ReviewArtifact): ReviewArtifactExportAdapter[] {
        return this.getAdapters().filter(adapter => adapter.supports(artifact));
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

interface CopilotAnnotationGroups {
    requestedChanges: ReviewAnnotation[];
    missingSteps: ReviewAnnotation[];
    risksOrConcerns: ReviewAnnotation[];
    openQuestions: ReviewAnnotation[];
    additionalNotes: ReviewAnnotation[];
}

function appendMetadataBulletList(
    lines: string[],
    heading: string,
    metadata: ReviewArtifactMetadata | undefined
): void {
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

function appendReviewContext(lines: string[], artifact: ReviewArtifact): void {
    if (artifact.content.sections && artifact.content.sections.length > 0) {
        lines.push('### Sections Under Review');
        lines.push('');

        [...artifact.content.sections]
            .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
            .forEach(section => {
                const summary = section.heading ?? section.id;
                const lineRange = typeof section.lineStart === 'number' && typeof section.lineEnd === 'number'
                    ? ` (lines ${section.lineStart}-${section.lineEnd})`
                    : '';
                lines.push(`- ${summary}${lineRange}`);
            });

        return;
    }

    if (artifact.content.diffFiles && artifact.content.diffFiles.length > 0) {
        lines.push('### Diff Files Under Review');
        lines.push('');

        [...artifact.content.diffFiles]
            .sort((left, right) => `${left.newPath}|${left.oldPath}`.localeCompare(`${right.newPath}|${right.oldPath}`))
            .forEach(diffFile => {
                lines.push(`- ${diffFile.newPath} [${diffFile.status}]`);
            });

        return;
    }

    const previewLines = artifact.content.rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

    if (previewLines.length > 0) {
        lines.push('### Raw Content Preview');
        lines.push('');
        previewLines.forEach(line => {
            lines.push(`- ${line}`);
        });
        return;
    }

    lines.push('No structured context is available for this artifact.');
}

function appendCopilotAnnotationSection(
    lines: string[],
    heading: string,
    annotations: ReviewAnnotation[],
    emptyMessage: string
): void {
    lines.push('');
    lines.push(`## ${heading}`);
    lines.push('');

    if (annotations.length === 0) {
        lines.push(emptyMessage);
        return;
    }

    annotations.forEach((annotation, index) => {
        appendCopilotAnnotation(lines, annotation, index + 1);
    });
}

function appendCopilotAnnotation(lines: string[], annotation: ReviewAnnotation, index: number): void {
    const severity = annotation.severity ? ` [${annotation.severity}]` : '';

    lines.push(`### ${index}. ${formatAnnotationLabel(annotation)}${severity}`);
    lines.push(`- Target: ${formatAnnotationTarget(annotation)}`);
    lines.push(`- Annotation ID: ${annotation.id}`);
    lines.push(`- Created At: ${annotation.createdAt}`);
    lines.push(`- Updated At: ${annotation.updatedAt}`);
    lines.push('');
    lines.push(annotation.body);

    if (annotation.suggestedReplacement) {
        lines.push('');
        lines.push('Suggested revision:');
        lines.push('```text');
        lines.push(annotation.suggestedReplacement);
        lines.push('```');
    }

    if (annotation.metadata && Object.keys(annotation.metadata).length > 0) {
        lines.push('');
        lines.push('Metadata:');

        Object.entries(annotation.metadata)
            .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
            .forEach(([key, value]) => {
                lines.push(`- ${key}: ${value}`);
            });
    }

    lines.push('');
}

function sortAnnotations(annotations: ReviewAnnotation[]): ReviewAnnotation[] {
    return [...annotations].sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
            return left.createdAt.localeCompare(right.createdAt);
        }

        return left.id.localeCompare(right.id);
    });
}

function groupAnnotationsForCopilot(annotations: ReviewAnnotation[]): CopilotAnnotationGroups {
    const groups: CopilotAnnotationGroups = {
        requestedChanges: [],
        missingSteps: [],
        risksOrConcerns: [],
        openQuestions: [],
        additionalNotes: [],
    };

    annotations.forEach(annotation => {
        if (isMissingStep(annotation)) {
            groups.missingSteps.push(annotation);
            return;
        }

        if (isRiskOrConcern(annotation)) {
            groups.risksOrConcerns.push(annotation);
            return;
        }

        if (annotation.kind === 'question') {
            groups.openQuestions.push(annotation);
            return;
        }

        if (isRequestedChange(annotation)) {
            groups.requestedChanges.push(annotation);
            return;
        }

        groups.additionalNotes.push(annotation);
    });

    return groups;
}

function isRequestedChange(annotation: ReviewAnnotation): boolean {
    return annotation.kind === 'requestChange'
        || annotation.kind === 'maintainability'
        || annotation.metadata?.category === 'request_change'
    || annotation.metadata?.category === 'maintainability'
        || annotation.metadata?.category === 'replacement'
        || annotation.metadata?.category === 'suggested_replacement';
}

function isMissingStep(annotation: ReviewAnnotation): boolean {
    return annotation.kind === 'issue' || annotation.metadata?.category === 'missing_step';
}

function isRiskOrConcern(annotation: ReviewAnnotation): boolean {
    return annotation.kind === 'risk'
        || annotation.kind === 'testGap'
        || annotation.metadata?.category === 'bug_risk'
        || annotation.metadata?.category === 'performance'
        || annotation.metadata?.category === 'security'
        || annotation.metadata?.category === 'test_gap';
}

function buildCopilotNextSteps(
    artifact: ReviewArtifact,
    groups: CopilotAnnotationGroups,
    openAnnotations: ReviewAnnotation[]
): string[] {
    const steps: string[] = [];

    if (groups.requestedChanges.length > 0) {
        steps.push('Revise the implementation approach to address every requested change before continuing.');
    }

    if (groups.missingSteps.length > 0) {
        steps.push('Add the missing steps or sequencing details so the review artifact covers the full delivery path.');
    }

    if (groups.risksOrConcerns.length > 0) {
        steps.push('Mitigate the identified risks and test gaps, or document why each concern is acceptable.');
    }

    if (groups.openQuestions.length > 0) {
        steps.push('Answer the open questions explicitly in the next revision instead of leaving them implicit.');
    }

    if (openAnnotations.length > 0) {
        steps.push(`After updating ${artifact.title}, re-run the review and confirm the ${openAnnotations.length} open annotation(s) are resolved or intentionally deferred.`);
    }

    return steps;
}

function formatAnnotationLabel(annotation: ReviewAnnotation): string {
    switch (annotation.metadata?.category) {
        case 'bug_risk':
            return 'Bug Risk';
        case 'follow_up':
            return 'Follow Up';
        case 'maintainability':
            return 'Maintainability';
        case 'performance':
            return 'Performance';
        case 'security':
            return 'Security';
        case 'test_gap':
            return 'Test Gap';
        default:
            break;
    }

    if (annotation.metadata?.category === 'replacement' || annotation.metadata?.category === 'suggested_replacement') {
        return 'Suggested Replacement';
    }

    switch (annotation.kind) {
        case 'requestChange':
            return 'Request Change';
        case 'issue':
            return 'Missing Step';
        case 'risk':
            return 'Risk';
        case 'question':
            return 'Open Question';
        case 'testGap':
            return 'Test Gap';
        case 'maintainability':
            return 'Maintainability';
        case 'comment':
        default:
            return 'Comment';
    }
}

function formatAnnotationTarget(annotation: ReviewAnnotation): string {
    const { target } = annotation;

    switch (target.type) {
        case 'section':
            return target.sectionId ? `section:${target.sectionId}` : 'section';
        case 'block':
            return target.blockId ? `block:${target.blockId}` : 'block';
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