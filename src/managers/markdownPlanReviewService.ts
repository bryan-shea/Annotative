import * as path from 'path';
import * as vscode from 'vscode';
import {
    ReviewArtifact,
    ReviewArtifactBlock,
    ReviewArtifactBlockKind,
    ReviewArtifactMetadata,
    ReviewArtifactSection,
    ReviewArtifactSource,
} from '../types';
import { ReviewArtifactManager } from './reviewArtifactManager';

const PLAN_PARSER_ID = 'markdownPlanV1';

export interface ParsedMarkdownPlan {
    title?: string;
    sections: ReviewArtifactSection[];
    blocks: ReviewArtifactBlock[];
    metadata: ReviewArtifactMetadata;
}

export interface CreateMarkdownPlanArtifactInput {
    rawText: string;
    title?: string;
    source: ReviewArtifactSource;
}

interface MutableSection {
    id: string;
    heading?: string;
    level: number;
    order: number;
    lineStart?: number;
    lineEnd?: number;
    bodyStartLine?: number;
    lines: string[];
    metadata?: ReviewArtifactMetadata;
}

export class MarkdownPlanReviewService {
    constructor(private readonly reviewArtifactManager: ReviewArtifactManager) {}

    async createArtifactFromMarkdown(input: CreateMarkdownPlanArtifactInput): Promise<ReviewArtifact> {
        const normalizedText = normalizeLineEndings(input.rawText);
        const parsed = parseMarkdownPlan(normalizedText);
        const title = input.title?.trim() || parsed.title || deriveTitleFromSource(input.source) || 'Review Markdown Plan';

        return this.reviewArtifactManager.createAndSaveArtifact({
            kind: 'plan',
            title,
            source: input.source,
            content: {
                rawText: normalizedText,
                sections: parsed.sections,
                blocks: parsed.blocks,
                metadata: parsed.metadata,
            },
        });
    }

    createSourceFromDocument(document: vscode.TextDocument, metadata: ReviewArtifactMetadata = {}): ReviewArtifactSource {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

        return {
            type: 'markdownFile',
            uri: document.uri.toString(),
            workspaceFolder: workspaceFolder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            metadata: {
                fileName: path.basename(document.fileName),
                languageId: document.languageId,
                ...metadata,
            },
        };
    }
}

export function parseMarkdownPlan(rawText: string): ParsedMarkdownPlan {
    const normalized = normalizeLineEndings(rawText);
    const lines = normalized.split('\n');
    const sourceSections: MutableSection[] = [];
    const blocks: ReviewArtifactBlock[] = [];
    let title: string | undefined;
    let currentSection: MutableSection | undefined;
    let inCodeFence = false;
    let fenceMarker = '';
    let encounteredNonWhitespace = false;
    const slugCounts = new Map<string, number>();

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineNumber = index + 1;
        const fenceMatch = line.match(/^\s*(```+|~~~+)/);

        if (fenceMatch) {
            if (!inCodeFence) {
                inCodeFence = true;
                fenceMarker = fenceMatch[1][0];
            } else if (fenceMatch[1][0] === fenceMarker) {
                inCodeFence = false;
                fenceMarker = '';
            }
        }

        const headingMatch = !inCodeFence ? line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/) : undefined;
        if (headingMatch) {
            const level = headingMatch[1].length;
            const heading = headingMatch[2].trim();

            if (!encounteredNonWhitespace && !title && level === 1) {
                title = heading;
                encounteredNonWhitespace = true;
                if (currentSection) {
                    currentSection.lineEnd = lineNumber - 1;
                }
                currentSection = undefined;
                continue;
            }

            if (currentSection) {
                currentSection.lineEnd = lineNumber - 1;
            }

            currentSection = {
                id: createSectionId(heading, sourceSections.length + 1, slugCounts),
                heading,
                level,
                order: sourceSections.length + 1,
                lineStart: lineNumber,
                lineEnd: lineNumber,
                bodyStartLine: lineNumber + 1,
                lines: [],
            };
            sourceSections.push(currentSection);
            encounteredNonWhitespace = true;
            continue;
        }

        if (!currentSection) {
            if (line.trim().length === 0) {
                continue;
            }

            currentSection = {
                id: createSectionId('overview', sourceSections.length + 1, slugCounts),
                level: 0,
                order: sourceSections.length + 1,
                lineStart: lineNumber,
                lineEnd: lineNumber,
                bodyStartLine: lineNumber,
                lines: [],
                metadata: { synthetic: true },
            };
            sourceSections.push(currentSection);
        }

        currentSection.lines.push(line);
        currentSection.lineEnd = lineNumber;

        if (line.trim().length > 0) {
            encounteredNonWhitespace = true;
        }
    }

    const sections = sourceSections
        .map(section => finalizeSection(section))
        .filter((section): section is ReviewArtifactSection => section !== undefined);

    sections.forEach(section => {
        const sourceSection = sourceSections.find(candidate => candidate.id === section.id);
        const sectionBlocks = parseSectionBlocks(
            section,
            sourceSection?.lines ?? [],
            sourceSection?.bodyStartLine ?? section.lineStart ?? 1
        );
        section.metadata = {
            ...section.metadata,
            blockCount: sectionBlocks.length,
        };
        blocks.push(...sectionBlocks);
    });

    return {
        title,
        sections,
        blocks,
        metadata: {
            parser: PLAN_PARSER_ID,
            sectionCount: sections.length,
            blockCount: blocks.length,
        },
    };
}

function finalizeSection(section: MutableSection): ReviewArtifactSection | undefined {
    const { lines, leadingTrimCount, trailingTrimCount } = trimEmptyLines(section.lines);
    const content = lines.join('\n').trimEnd();
    const lineStart = section.heading
        ? section.lineStart
        : typeof section.lineStart === 'number'
            ? section.lineStart + leadingTrimCount
            : section.lineStart;
    const lineEnd = typeof section.lineEnd === 'number'
        ? section.lineEnd - trailingTrimCount
        : section.lineEnd;

    if (!section.heading && content.length === 0) {
        return undefined;
    }

    return {
        id: section.id,
        heading: section.heading,
        level: section.level,
        order: section.order,
        content,
        lineStart,
        lineEnd,
        metadata: section.metadata ? { ...section.metadata } : undefined,
    };
}

function parseSectionBlocks(section: ReviewArtifactSection, lines: string[], bodyStartLine: number): ReviewArtifactBlock[] {
    const blocks: ReviewArtifactBlock[] = [];
    let index = 0;
    let order = 1;

    while (index < lines.length) {
        while (index < lines.length && lines[index].trim().length === 0) {
            index += 1;
        }

        if (index >= lines.length) {
            break;
        }

        const startIndex = index;
        const firstLine = lines[index];
        const classifiedKind = classifyBlock(firstLine);

        if (classifiedKind === 'code') {
            const marker = firstLine.trim().startsWith('~~~') ? '~~~' : '```';
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith(marker)) {
                index += 1;
            }
            if (index < lines.length) {
                index += 1;
            }
        } else if (classifiedKind === 'list') {
            index += 1;
            while (index < lines.length && lines[index].trim().length > 0 && isListContinuation(lines[index])) {
                index += 1;
            }
        } else if (classifiedKind === 'quote') {
            index += 1;
            while (index < lines.length && lines[index].trim().startsWith('>')) {
                index += 1;
            }
        } else if (classifiedKind === 'table') {
            index += 1;
            while (index < lines.length && isTableLine(lines[index])) {
                index += 1;
            }
        } else {
            index += 1;
            while (index < lines.length && lines[index].trim().length > 0 && classifyBlock(lines[index]) === 'other') {
                index += 1;
            }
        }

        const content = lines.slice(startIndex, index).join('\n').trimEnd();
        if (content.length === 0) {
            continue;
        }

        blocks.push({
            id: `${section.id}-block-${order}`,
            sectionId: section.id,
            kind: classifiedKind === 'other' ? 'paragraph' : classifiedKind,
            order,
            content,
            lineStart: bodyStartLine + startIndex,
            lineEnd: bodyStartLine + index - 1,
            metadata: {
                sectionHeading: section.heading ?? 'Overview',
            },
        });
        order += 1;
    }

    return blocks;
}

function classifyBlock(line: string): ReviewArtifactBlockKind {
    const trimmed = line.trim();

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        return 'code';
    }

    if (/^(?:[-*+]\s+|\d+\.\s+)/.test(trimmed)) {
        return 'list';
    }

    if (trimmed.startsWith('>')) {
        return 'quote';
    }

    if (isTableLine(line)) {
        return 'table';
    }

    return 'other';
}

function isListContinuation(line: string): boolean {
    const trimmed = line.trim();
    return /^(?:[-*+]\s+|\d+\.\s+)/.test(trimmed) || /^\s{2,}\S/.test(line);
}

function isTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function trimEmptyLines(lines: string[]): { lines: string[]; leadingTrimCount: number; trailingTrimCount: number } {
    let start = 0;
    let end = lines.length;

    while (start < end && lines[start].trim().length === 0) {
        start += 1;
    }

    while (end > start && lines[end - 1].trim().length === 0) {
        end -= 1;
    }

    return {
        lines: lines.slice(start, end),
        leadingTrimCount: start,
        trailingTrimCount: lines.length - end,
    };
}

function createSectionId(heading: string, order: number, slugCounts: Map<string, number>): string {
    const baseSlug = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `section-${order}`;
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    return count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
}

function deriveTitleFromSource(source: ReviewArtifactSource): string | undefined {
    const fileName = typeof source.metadata?.fileName === 'string' ? source.metadata.fileName : undefined;
    if (fileName) {
        return fileName.replace(/\.(md|markdown)$/i, '');
    }

    if (source.uri?.startsWith('file:')) {
        return path.basename(vscode.Uri.parse(source.uri).fsPath).replace(/\.(md|markdown)$/i, '');
    }

    return undefined;
}

function normalizeLineEndings(value: string): string {
    return value.replace(/\r\n/g, '\n');
}