/**
 * Commands Module
 * Exports all command registration functions
 */

import * as vscode from 'vscode';
import { AiResponseReviewService, AnnotationManager, MarkdownPlanReviewService, ReviewArtifactManager } from '../managers';
import { AnnotationProvider, PlanReviewPanel, SidebarWebview } from '../ui';

export type CommandContext = {
    annotationManager: AnnotationManager;
    sidebarWebview: SidebarWebview;
    annotationProvider?: AnnotationProvider;
    reviewArtifactManager?: ReviewArtifactManager;
    aiResponseReviewService?: AiResponseReviewService;
    markdownPlanReviewService?: MarkdownPlanReviewService;
    planReviewPanel?: PlanReviewPanel;
    ANNOTATION_COLORS: Array<{ label: string; value: string }>;
};

// Import all command modules
export { registerAnnotationCommands } from './annotation';
export { registerAiResponseReviewCommands } from './aiResponseReview';
export { registerExportCommands } from './export';
export { registerFilterCommands } from './filters';
export { registerNavigationCommands } from './navigation';
export { registerPlanReviewCommands } from './planReview';
export { registerSidebarCommands } from './sidebar';
export { registerTagCommands } from './tags';
