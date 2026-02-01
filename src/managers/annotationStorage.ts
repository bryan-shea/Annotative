import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Annotation, AnnotationStorage as IAnnotationStorage, AnnotationTag } from '../types';

/**
 * Handles persistence of annotations and custom tags
 * Uses project-scoped storage (.annotative folder) exclusively
 * Each workspace has isolated annotation data
 */
export class AnnotationStorageManager {
    private storageFilePath: string;
    private customTagsPath: string;
    private projectStorageDir: string | undefined;

    constructor(
        private annotations: Map<string, Annotation[]>,
        context: vscode.ExtensionContext
    ) {
        // Initialize paths - will be set properly when project storage is created
        this.storageFilePath = '';
        this.customTagsPath = '';

        // Check for existing project storage
        this.detectProjectStorage();
    }

    /**
     * Detect if project-based storage exists (.annotative folder in workspace root)
     */
    private detectProjectStorage(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const annotativeDir = path.join(workspaceRoot, '.annotative');

            if (fs.existsSync(annotativeDir)) {
                this.projectStorageDir = annotativeDir;
                this.storageFilePath = path.join(annotativeDir, 'annotations.json');
                this.customTagsPath = path.join(annotativeDir, 'customTags.json');
            }
        }
    }

    /**
     * Check if project storage is active
     */
    isProjectStorageActive(): boolean {
        return !!this.projectStorageDir;
    }

    /**
     * Get the current storage directory path
     */
    getStorageDirectory(): string {
        return this.projectStorageDir || '';
    }

    /**
     * Ensure project storage exists - creates .annotative folder if needed
     * Called automatically when first annotation is added
     */
    async ensureProjectStorage(): Promise<void> {
        if (this.projectStorageDir) {
            return; // Already initialized
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open'); // Cannot create project storage
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const annotativeDir = path.join(workspaceRoot, '.annotative');

        // Create the directory
        if (!fs.existsSync(annotativeDir)) {
            fs.mkdirSync(annotativeDir, { recursive: true });

            // Create a README to explain the folder purpose
            const readmePath = path.join(annotativeDir, 'README.md');
            const readmeContent = `# Annotative Storage\n\nThis folder contains your project's annotations and custom tags.\n\n## Version Control\n\n**Recommended:** Include this folder in version control to share annotations with your team.\n\n\`\`\`bash\ngit add .annotative/\ngit commit -m "Add annotations"\n\`\`\`\n\n**Private annotations:** Add \`.annotative/\` to your project's \`.gitignore\` file.\n\n## Files\n\n- \`annotations.json\` - All annotations in this project\n- \`customTags.json\` - User-defined tag definitions\n`;
            fs.writeFileSync(readmePath, readmeContent, 'utf-8');
        }

        // Set paths
        this.projectStorageDir = annotativeDir;
        this.storageFilePath = path.join(annotativeDir, 'annotations.json');
        this.customTagsPath = path.join(annotativeDir, 'customTags.json');
    }

    /**
     * Initialize project-based storage (.annotative folder)
     * Returns true if successfully created, false if already exists
     * @deprecated Use ensureProjectStorage() instead - storage is now auto-created
     */
    async initializeProjectStorage(migrateExisting: boolean = false): Promise<boolean> {
        // Capture whether the storage file existed before initialization
        const existedBefore = this.storageFilePath && fs.existsSync(this.storageFilePath);
        await this.ensureProjectStorage();
        // Return true only if storage did not exist before but exists after ensuring
        return !existedBefore && fs.existsSync(this.storageFilePath);
    }

    /**
     * Refresh storage detection (useful after folder changes)
     */
    refreshStorageDetection(): void {
        this.projectStorageDir = undefined;
        this.storageFilePath = '';
        this.customTagsPath = '';
        this.detectProjectStorage();
    }

    /**
     * Load annotations from storage
     * Only loads if project storage exists
     */
    async loadAnnotations(): Promise<void> {
        try {
            if (!this.storageFilePath || !fs.existsSync(this.storageFilePath)) {
                return;
            }

            const data = fs.readFileSync(this.storageFilePath, 'utf-8');
            const storage: { workspaceAnnotations: { [key: string]: Annotation[] } } = JSON.parse(data);

            this.annotations.clear();
            Object.entries(storage.workspaceAnnotations).forEach(([filePath, annotations]) => {
                const normalizedAnnotations = annotations.map(ann => ({
                    ...ann,
                    timestamp: new Date(ann.timestamp as any)
                }));
                this.annotations.set(filePath, normalizedAnnotations);
            });
        } catch (error) {
            console.error('Failed to load annotations:', error);
        }
    }

    /**
     * Save annotations to storage
     * Auto-creates project storage if it doesn't exist
     */
    async saveAnnotations(): Promise<void> {
        try {
            // Ensure project storage exists
            await this.ensureProjectStorage();

            const storage: IAnnotationStorage = {
                workspaceAnnotations: Object.fromEntries(this.annotations)
            };

            fs.writeFileSync(this.storageFilePath, JSON.stringify(storage, null, 2));
        } catch (error) {
            console.error('Failed to save annotations:', error);
            vscode.window.showErrorMessage('Failed to save annotations');
        }
    }

    /**
     * Load custom tags from storage
     */
    async loadCustomTags(): Promise<AnnotationTag[]> {
        try {
            if (this.customTagsPath && fs.existsSync(this.customTagsPath)) {
                const data = fs.readFileSync(this.customTagsPath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load custom tags:', error);
        }
        return [];
    }

    /**
     * Save custom tags to storage
     * Auto-creates project storage if it doesn't exist
     */
    async saveCustomTags(tags: AnnotationTag[]): Promise<void> {
        try {
            // Ensure project storage exists
            await this.ensureProjectStorage();

            fs.writeFileSync(this.customTagsPath, JSON.stringify(tags, null, 2));
        } catch (error) {
            console.error('Failed to save custom tags:', error);
            vscode.window.showErrorMessage('Failed to save custom tags');
        }
    }
}
