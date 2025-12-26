import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Annotation, AnnotationStorage as IAnnotationStorage, AnnotationTag } from '../types';

/**
 * Handles persistence of annotations and custom tags
 * Manages file I/O for storage
 * Supports project-based storage via .annotative folder
 */
export class AnnotationStorageManager {
    private storageFilePath: string;
    private customTagsPath: string;
    private globalStorageDir: string;
    private projectStorageDir: string | undefined;
    private useProjectStorage: boolean = false;

    constructor(
        private annotations: Map<string, Annotation[]>,
        context: vscode.ExtensionContext
    ) {
        this.globalStorageDir = context.globalStorageUri?.fsPath || context.extensionUri.fsPath;
        this.storageFilePath = path.join(this.globalStorageDir, 'annotations.json');
        this.customTagsPath = path.join(this.globalStorageDir, 'customTags.json');

        // Check for project-based storage
        this.detectProjectStorage();
    }

    /**
     * Detect if project-based storage is available (.annotative folder in workspace root)
     */
    private detectProjectStorage(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const annotativeDir = path.join(workspaceRoot, '.annotative');

            if (fs.existsSync(annotativeDir)) {
                this.projectStorageDir = annotativeDir;
                this.useProjectStorage = true;
                this.storageFilePath = path.join(annotativeDir, 'annotations.json');
                this.customTagsPath = path.join(annotativeDir, 'customTags.json');
            }
        }
    }

    /**
     * Check if project storage is active
     */
    isProjectStorageActive(): boolean {
        return this.useProjectStorage;
    }

    /**
     * Get the current storage directory path
     */
    getStorageDirectory(): string {
        return this.useProjectStorage && this.projectStorageDir
            ? this.projectStorageDir
            : this.globalStorageDir;
    }

    /**
     * Initialize project-based storage (.annotative folder)
     * Returns true if successfully created, false if already exists
     */
    async initializeProjectStorage(migrateExisting: boolean = false): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const annotativeDir = path.join(workspaceRoot, '.annotative');

        if (fs.existsSync(annotativeDir)) {
            // Already exists, just switch to it
            this.projectStorageDir = annotativeDir;
            this.useProjectStorage = true;
            this.storageFilePath = path.join(annotativeDir, 'annotations.json');
            this.customTagsPath = path.join(annotativeDir, 'customTags.json');
            return false;
        }

        // Create the directory
        fs.mkdirSync(annotativeDir, { recursive: true });

        // Create a README file for documentation
        const readmePath = path.join(annotativeDir, 'README.md');
        const readmeContent = `# Annotative Project Storage

This folder contains project-specific annotations for this codebase.

## Files

- \`annotations.json\` - All annotations for this project
- \`customTags.json\` - Custom tags defined for this project

## Usage

This folder is managed by the [Annotative](https://marketplace.visualstudio.com/items?itemName=bryan-shea.annotative) VS Code extension.

You can commit this folder to version control to share annotations with your team.
`;
        fs.writeFileSync(readmePath, readmeContent, 'utf-8');

        // Switch to project storage
        const oldStoragePath = this.storageFilePath;
        const oldTagsPath = this.customTagsPath;

        this.projectStorageDir = annotativeDir;
        this.useProjectStorage = true;
        this.storageFilePath = path.join(annotativeDir, 'annotations.json');
        this.customTagsPath = path.join(annotativeDir, 'customTags.json');

        // Migrate existing annotations if requested
        if (migrateExisting) {
            if (fs.existsSync(oldStoragePath)) {
                fs.copyFileSync(oldStoragePath, this.storageFilePath);
            }
            if (fs.existsSync(oldTagsPath)) {
                fs.copyFileSync(oldTagsPath, this.customTagsPath);
            }
        }

        return true;
    }

    /**
     * Refresh storage detection (useful after folder changes)
     */
    refreshStorageDetection(): void {
        this.useProjectStorage = false;
        this.projectStorageDir = undefined;
        this.storageFilePath = path.join(this.globalStorageDir, 'annotations.json');
        this.customTagsPath = path.join(this.globalStorageDir, 'customTags.json');
        this.detectProjectStorage();
    }

    /**
     * Load annotations from storage
     */
    async loadAnnotations(): Promise<void> {
        try {
            if (fs.existsSync(this.storageFilePath)) {
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
            }
        } catch (error) {
            console.error('Failed to load annotations:', error);
        }
    }

    /**
     * Save annotations to storage
     */
    async saveAnnotations(): Promise<void> {
        try {
            // Ensure storage directory exists
            const storageDir = path.dirname(this.storageFilePath);
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

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
            if (fs.existsSync(this.customTagsPath)) {
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
     */
    async saveCustomTags(tags: AnnotationTag[]): Promise<void> {
        try {
            // Ensure storage directory exists
            const storageDir = path.dirname(this.customTagsPath);
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            fs.writeFileSync(this.customTagsPath, JSON.stringify(tags, null, 2));
        } catch (error) {
            console.error('Failed to save custom tags:', error);
            vscode.window.showErrorMessage('Failed to save custom tags');
        }
    }
}
