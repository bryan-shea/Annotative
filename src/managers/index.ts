/**
 * Annotation managers module
 * Organized for modularity: storage, CRUD, decorations, export, and main manager
 */

export { AnnotationManager } from './annotationManager';
export { AnnotationCRUD } from './annotationCRUD';
export { AnnotationDecorations } from './annotationDecorations';
export { AnnotationExportService } from './annotationExportService';
export { AnnotationStorageManager } from './annotationStorage';
export { AnnotationExporter } from './annotationExporter';
export { ReviewArtifactManager, REVIEW_ARTIFACT_MODEL_VERSION, type CreateReviewArtifactInput } from './reviewArtifactManager';
export {
	MarkdownPlanReviewService,
	parseMarkdownPlan,
	type CreateMarkdownPlanArtifactInput,
	type ParsedMarkdownPlan,
} from './markdownPlanReviewService';
export {
	ReviewArtifactExportService,
	CopilotReviewPromptReviewArtifactExportAdapter,
	GenericMarkdownReviewArtifactExportAdapter,
	type ReviewArtifactExportAdapter,
	type ReviewArtifactExportResult,
} from './reviewArtifactExportService';
export {
	ReviewArtifactStorageManager,
	type LoadReviewArtifactResult,
	type ListReviewArtifactsResult,
} from './reviewArtifactStorage';
