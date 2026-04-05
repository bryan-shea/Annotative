import * as path from 'path';
import * as vscode from 'vscode';
import { ReviewArtifactSource } from '../types';
import { CommandContext } from './index';

type PlanSourceMode = 'currentFile' | 'selection' | 'importedFile' | 'clipboard';

interface PlanSourceOption {
    label: string;
    description: string;
    mode: PlanSourceMode;
}

interface ResolvedPlanSource {
    rawText: string;
    title?: string;
    source: ReviewArtifactSource;
}

export function registerPlanReviewCommands(
    _context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { markdownPlanReviewService, planReviewPanel } = cmdContext;

    if (!markdownPlanReviewService || !planReviewPanel) {
        return {};
    }

    const reviewMarkdownPlanCommand = vscode.commands.registerCommand(
        'annotative.reviewMarkdownPlan',
        async () => {
            try {
                const resolved = await resolvePlanSource(markdownPlanReviewService);
                if (!resolved) {
                    return;
                }

                const artifact = await markdownPlanReviewService.createArtifactFromMarkdown({
                    rawText: resolved.rawText,
                    title: resolved.title,
                    source: resolved.source,
                });

                await planReviewPanel.showArtifact(artifact.id);
                vscode.window.showInformationMessage(`Plan review created: ${artifact.title}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to review markdown plan: ${message}`);
            }
        }
    );

    return {
        reviewMarkdownPlanCommand,
    };
}

async function resolvePlanSource(
    markdownPlanReviewService: NonNullable<CommandContext['markdownPlanReviewService']>
): Promise<ResolvedPlanSource | undefined> {
    const editor = vscode.window.activeTextEditor;
    const options = buildPlanSourceOptions(editor);
    const selected = options.length === 1
        ? options[0]
        : await vscode.window.showQuickPick(options, {
            placeHolder: 'Choose a markdown plan source',
        });

    if (!selected) {
        return undefined;
    }

    switch (selected.mode) {
        case 'currentFile':
            return resolveCurrentFileSource(markdownPlanReviewService, editor);
        case 'selection':
            return resolveSelectionSource(markdownPlanReviewService, editor);
        case 'importedFile':
            return resolveImportedFileSource(markdownPlanReviewService);
        case 'clipboard':
            return resolveClipboardSource();
        default:
            return undefined;
    }
}

function buildPlanSourceOptions(editor: vscode.TextEditor | undefined): PlanSourceOption[] {
    const options: PlanSourceOption[] = [
        {
            label: 'Import Markdown File',
            description: 'Pick a markdown plan from disk',
            mode: 'importedFile',
        },
        {
            label: 'Use Clipboard Markdown',
            description: 'Create a persisted plan review from clipboard text',
            mode: 'clipboard',
        },
    ];

    if (editor && isMarkdownDocument(editor.document)) {
        options.unshift({
            label: 'Current Markdown File',
            description: 'Review the active markdown document',
            mode: 'currentFile',
        });

        if (!editor.selection.isEmpty) {
            options.splice(1, 0, {
                label: 'Selected Markdown Text',
                description: 'Review only the selected markdown range',
                mode: 'selection',
            });
        }
    }

    return options;
}

function resolveCurrentFileSource(
    markdownPlanReviewService: NonNullable<CommandContext['markdownPlanReviewService']>,
    editor: vscode.TextEditor | undefined
): ResolvedPlanSource {
    if (!editor || !isMarkdownDocument(editor.document)) {
        throw new Error('Open a markdown file to review the current document.');
    }

    return {
        rawText: editor.document.getText(),
        source: markdownPlanReviewService.createSourceFromDocument(editor.document, {
            sourceMode: 'currentFile',
        }),
    };
}

function resolveSelectionSource(
    markdownPlanReviewService: NonNullable<CommandContext['markdownPlanReviewService']>,
    editor: vscode.TextEditor | undefined
): ResolvedPlanSource {
    if (!editor || !isMarkdownDocument(editor.document) || editor.selection.isEmpty) {
        throw new Error('Select markdown text before starting a plan review.');
    }

    const rawText = editor.document.getText(editor.selection).trim();
    if (rawText.length === 0) {
        throw new Error('The selected markdown text is empty.');
    }

    return {
        rawText,
        title: `${path.basename(editor.document.fileName, path.extname(editor.document.fileName))} excerpt`,
        source: markdownPlanReviewService.createSourceFromDocument(editor.document, {
            sourceMode: 'selection',
            selectionStartLine: String(editor.selection.start.line + 1),
            selectionEndLine: String(editor.selection.end.line + 1),
        }),
    };
}

async function resolveImportedFileSource(
    markdownPlanReviewService: NonNullable<CommandContext['markdownPlanReviewService']>
): Promise<ResolvedPlanSource | undefined> {
    const selected = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            Markdown: ['md', 'markdown'],
        },
        openLabel: 'Review Markdown Plan',
    });

    if (!selected || selected.length === 0) {
        return undefined;
    }

    const document = await vscode.workspace.openTextDocument(selected[0]);
    return {
        rawText: document.getText(),
        source: markdownPlanReviewService.createSourceFromDocument(document, {
            sourceMode: 'importedFile',
        }),
    };
}

async function resolveClipboardSource(): Promise<ResolvedPlanSource> {
    const rawText = (await vscode.env.clipboard.readText()).trim();
    if (rawText.length === 0) {
        throw new Error('Clipboard does not contain markdown text.');
    }

    return {
        rawText,
        source: {
            type: 'manualPaste',
            workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            metadata: {
                sourceMode: 'clipboard',
            },
        },
    };
}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown' || /\.(md|markdown)$/i.test(document.fileName);
}