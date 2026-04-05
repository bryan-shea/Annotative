import * as vscode from 'vscode';
import { AiResponseReviewService, AnnotationManager, LocalDiffReviewService, MarkdownPlanReviewService, ReviewArtifactManager } from './managers';
import { PlanReviewPanel, SidebarWebview } from './ui';
import { registerChatParticipant, registerChatVariableIfAvailable } from './copilotChatParticipant';
import {
    registerAnnotationCommands,
    registerAiResponseReviewCommands,
    registerExportCommands,
    registerFilterCommands,
    registerLocalDiffReviewCommands,
    registerNavigationCommands,
    registerPlanReviewCommands,
    registerSidebarCommands,
    registerTagCommands,
    type CommandContext
} from './commands';

// Predefined color palette for annotations - user's visual preference only
const ANNOTATION_COLORS = [
    { label: 'Yellow', value: '#ffc107' },
    { label: 'Red', value: '#f44336' },
    { label: 'Orange', value: '#ff9800' },
    { label: 'Blue', value: '#2196f3' },
    { label: 'Green', value: '#4caf50' },
    { label: 'Purple', value: '#9c27b0' },
    { label: 'Brown', value: '#795548' },
    { label: 'Gray', value: '#9e9e9e' }
];

let annotationManager: AnnotationManager;
let sidebarWebview: SidebarWebview;
let reviewArtifactManager: ReviewArtifactManager;
let aiResponseReviewService: AiResponseReviewService;
let localDiffReviewService: LocalDiffReviewService;
let markdownPlanReviewService: MarkdownPlanReviewService;
let planReviewPanel: PlanReviewPanel;

export function activate(context: vscode.ExtensionContext) {
    // Initialize core managers
    annotationManager = new AnnotationManager(context);
    reviewArtifactManager = new ReviewArtifactManager();
    aiResponseReviewService = new AiResponseReviewService(reviewArtifactManager);
    localDiffReviewService = new LocalDiffReviewService(reviewArtifactManager);
    markdownPlanReviewService = new MarkdownPlanReviewService(reviewArtifactManager);
    sidebarWebview = new SidebarWebview(context.extensionUri, annotationManager);
    planReviewPanel = new PlanReviewPanel(context.extensionUri, reviewArtifactManager);

    // Register sidebar webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarWebview.viewType,
            sidebarWebview,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Subscribe to annotation changes
    context.subscriptions.push(
        annotationManager.onDidChangeAnnotations(() => {
            sidebarWebview.refreshAnnotations();
        })
    );

    if (vscode.workspace.getConfiguration('annotative').get<boolean>('copilot.enabled', true)) {
        context.subscriptions.push(registerChatParticipant(context, annotationManager));
        const chatVariable = registerChatVariableIfAvailable(context, annotationManager);
        if (chatVariable) {
            context.subscriptions.push(chatVariable);
        }
    }

    // Create command context
    const cmdContext: CommandContext = {
        annotationManager,
        sidebarWebview,
        reviewArtifactManager,
        aiResponseReviewService,
        localDiffReviewService,
        markdownPlanReviewService,
        planReviewPanel,
        ANNOTATION_COLORS
    };

    // Register all command modules
    context.subscriptions.push(
        ...Object.values(registerAnnotationCommands(context, cmdContext)),
        ...Object.values(registerAiResponseReviewCommands(context, cmdContext)),
        ...Object.values(registerExportCommands(context, cmdContext)),
        ...Object.values(registerFilterCommands(context, cmdContext)),
        ...Object.values(registerLocalDiffReviewCommands(context, cmdContext)),
        ...Object.values(registerNavigationCommands(context, cmdContext)),
        ...Object.values(registerPlanReviewCommands(context, cmdContext)),
        ...Object.values(registerSidebarCommands(context, cmdContext)),
        ...Object.values(registerTagCommands(context, cmdContext))
    );

    // Update decorations for active editor
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                annotationManager.updateDecorations(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            void annotationManager.rebaseAnnotationsForDocument(document).then(changed => {
                if (changed) {
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.uri.toString() === document.uri.toString()) {
                        annotationManager.updateDecorations(activeEditor);
                    }
                }
            });
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            void annotationManager.rebaseAnnotationsForDocument(event.document).then(changed => {
                if (changed) {
                    const visibleEditor = vscode.window.visibleTextEditors.find(
                        editor => editor.document.uri.toString() === event.document.uri.toString()
                    );
                    if (visibleEditor) {
                        annotationManager.updateDecorations(visibleEditor);
                    }
                }
            });
        })
    );

    if (vscode.window.activeTextEditor) {
        annotationManager.updateDecorations(vscode.window.activeTextEditor);
    }

    context.subscriptions.push(annotationManager);
    context.subscriptions.push(planReviewPanel);
}

export function deactivate() {
    annotationManager?.dispose();
    planReviewPanel?.dispose();
    sidebarWebview?.dispose();
}
