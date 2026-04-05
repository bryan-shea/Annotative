import * as vscode from 'vscode';
import { ReviewArtifactSource } from '../types';
import { CommandContext } from './index';

type AiResponseSourceMode = 'manualPaste' | 'clipboard' | 'importedFile';

interface AiResponseSourceOption {
    label: string;
    description: string;
    mode: AiResponseSourceMode;
}

interface ResolvedAiResponseSource {
    rawText: string;
    title?: string;
    source: ReviewArtifactSource;
}

export const aiResponseReviewCommandDependencies = {
    readClipboardText: async (): Promise<string> => vscode.env.clipboard.readText(),
};

export function registerAiResponseReviewCommands(
    _context: vscode.ExtensionContext,
    cmdContext: CommandContext
) {
    const { aiResponseReviewService, planReviewPanel } = cmdContext;

    if (!aiResponseReviewService || !planReviewPanel) {
        return {};
    }

    const reviewLastAiResponseCommand = vscode.commands.registerCommand(
        'annotative.reviewLastAIResponse',
        async () => {
            try {
                const resolved = await resolveAiResponseSource(aiResponseReviewService);
                if (!resolved) {
                    return;
                }

                const artifact = await aiResponseReviewService.createArtifactFromResponse({
                    rawText: resolved.rawText,
                    title: resolved.title,
                    source: resolved.source,
                });

                await planReviewPanel.showArtifact(artifact.id);
                vscode.window.showInformationMessage(`AI response review created: ${artifact.title}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to review last AI response: ${message}`);
            }
        }
    );

    return {
        reviewLastAiResponseCommand,
    };
}

async function resolveAiResponseSource(
    aiResponseReviewService: NonNullable<CommandContext['aiResponseReviewService']>
): Promise<ResolvedAiResponseSource | undefined> {
    const selected = await vscode.window.showQuickPick(buildAiResponseSourceOptions(), {
        placeHolder: 'Choose how to capture the last AI response',
    });

    if (!selected) {
        return undefined;
    }

    switch (selected.mode) {
        case 'manualPaste':
            return resolveManualPasteSource(aiResponseReviewService);
        case 'clipboard':
            return resolveClipboardSource(aiResponseReviewService);
        case 'importedFile':
            return resolveImportedFileSource(aiResponseReviewService);
        default:
            return undefined;
    }
}

function buildAiResponseSourceOptions(): AiResponseSourceOption[] {
    return [
        {
            label: 'Paste Into New Buffer',
            description: 'Open an untitled editor, paste the AI response, then create a review artifact',
            mode: 'manualPaste',
        },
        {
            label: 'Use Clipboard',
            description: 'Create a review artifact from the current clipboard contents',
            mode: 'clipboard',
        },
        {
            label: 'Import Text Or Markdown File',
            description: 'Create a review artifact from a saved response file',
            mode: 'importedFile',
        },
    ];
}

async function resolveManualPasteSource(
    aiResponseReviewService: NonNullable<CommandContext['aiResponseReviewService']>
): Promise<ResolvedAiResponseSource | undefined> {
    const document = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: '',
    });
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Active, false);
    const action = await vscode.window.showInformationMessage(
        'Paste the AI response into the untitled document, then choose Create Review.',
        'Create Review',
        'Cancel'
    );

    if (action !== 'Create Review') {
        return undefined;
    }

    const rawText = editor.document.getText().trim();
    if (rawText.length === 0) {
        throw new Error('The pasted AI response is empty.');
    }

    return {
        rawText,
        source: aiResponseReviewService.createManualPasteSource(
            {
                sourceMode: 'untitledBuffer',
                languageId: editor.document.languageId,
            },
            editor.document.uri.toString()
        ),
    };
}

async function resolveClipboardSource(
    aiResponseReviewService: NonNullable<CommandContext['aiResponseReviewService']>
): Promise<ResolvedAiResponseSource> {
    const rawText = (await aiResponseReviewCommandDependencies.readClipboardText()).trim();
    if (rawText.length === 0) {
        throw new Error('Clipboard does not contain AI response text.');
    }

    return {
        rawText,
        source: aiResponseReviewService.createManualPasteSource({
            sourceMode: 'clipboard',
        }),
    };
}

async function resolveImportedFileSource(
    aiResponseReviewService: NonNullable<CommandContext['aiResponseReviewService']>
): Promise<ResolvedAiResponseSource | undefined> {
    const selected = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            Text: ['txt', 'md', 'markdown'],
        },
        openLabel: 'Review AI Response',
    });

    if (!selected || selected.length === 0) {
        return undefined;
    }

    const document = await vscode.workspace.openTextDocument(selected[0]);
    const rawText = document.getText().trim();
    if (rawText.length === 0) {
        throw new Error('The imported AI response file is empty.');
    }

    return {
        rawText,
        source: aiResponseReviewService.createSourceFromDocument(document, {
            sourceMode: 'importedFile',
        }),
    };
}