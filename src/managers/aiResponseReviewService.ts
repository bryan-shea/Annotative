import * as path from 'path';
import * as vscode from 'vscode';
import {
    ReviewArtifact,
    ReviewArtifactMetadata,
    ReviewArtifactSource,
} from '../types';
import { ReviewArtifactManager } from './reviewArtifactManager';
import { parseStructuredMarkdownContent } from './markdownPlanReviewService';

const AI_RESPONSE_PARSER_ID = 'aiResponseMarkdownV1';
const DEFAULT_AI_RESPONSE_TITLE = 'Review Last AI Response';

export interface CreateAiResponseArtifactInput {
    rawText: string;
    title?: string;
    source: ReviewArtifactSource;
}

export class AiResponseReviewService {
    constructor(private readonly reviewArtifactManager: ReviewArtifactManager) {}

    async createArtifactFromResponse(input: CreateAiResponseArtifactInput): Promise<ReviewArtifact> {
        const normalizedText = normalizeResponseText(input.rawText);
        if (normalizedText.length === 0) {
            throw new Error('AI response content cannot be empty.');
        }

        const parsed = parseStructuredMarkdownContent(normalizedText, AI_RESPONSE_PARSER_ID);
        const title = input.title?.trim()
            || deriveTitleFromSource(input.source)
            || deriveTitleFromResponse(normalizedText)
            || DEFAULT_AI_RESPONSE_TITLE;

        return this.reviewArtifactManager.createAndSaveArtifact({
            kind: 'aiResponse',
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
            type: 'chatResponse',
            uri: document.uri.toString(),
            workspaceFolder: workspaceFolder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            metadata: {
                fileName: path.basename(document.fileName),
                languageId: document.languageId,
                ...metadata,
            },
        };
    }

    createManualPasteSource(metadata: ReviewArtifactMetadata = {}, uri?: string): ReviewArtifactSource {
        return {
            type: 'manualPaste',
            uri,
            workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            metadata,
        };
    }
}

function deriveTitleFromSource(source: ReviewArtifactSource): string | undefined {
    const fileName = typeof source.metadata?.fileName === 'string' ? source.metadata.fileName : undefined;
    if (fileName) {
        return fileName.replace(/\.(md|markdown|txt)$/i, '');
    }

    if (source.uri?.startsWith('file:')) {
        return path.basename(vscode.Uri.parse(source.uri).fsPath).replace(/\.(md|markdown|txt)$/i, '');
    }

    return undefined;
}

function deriveTitleFromResponse(rawText: string): string | undefined {
    const firstContentLine = rawText
        .split('\n')
        .map(line => line.trim())
        .find(line => line.length > 0);

    if (!firstContentLine) {
        return undefined;
    }

    const normalized = firstContentLine
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (normalized.length === 0) {
        return undefined;
    }

    const summary = normalized.length > 56 ? `${normalized.slice(0, 53).trimEnd()}...` : normalized;
    return `AI Response: ${summary}`;
}

function normalizeResponseText(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
}