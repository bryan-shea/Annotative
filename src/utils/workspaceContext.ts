import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Annotation } from '../types';

function getActiveWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    return activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : undefined;
}

function getWorkspaceFolderOrder(folder: vscode.WorkspaceFolder): number {
    return vscode.workspace.workspaceFolders?.findIndex(candidate => candidate.uri.toString() === folder.uri.toString()) ?? 0;
}

export function getWorkspaceFolderForFilePath(filePath: string): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
}

export function getRelativePathForFile(filePath: string): string {
    return vscode.workspace.asRelativePath(vscode.Uri.file(filePath), false);
}

export function getPreferredWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return getActiveWorkspaceFolder() || vscode.workspace.workspaceFolders?.[0];
}

export function resolveWorkspaceFolderForAnnotations(annotations: readonly Annotation[]): vscode.WorkspaceFolder | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    const folderCounts = new Map<string, { folder: vscode.WorkspaceFolder; count: number }>();

    annotations.forEach(annotation => {
        const folder = getWorkspaceFolderForFilePath(annotation.filePath);
        if (!folder) {
            return;
        }

        const key = folder.uri.toString();
        const existing = folderCounts.get(key);
        if (existing) {
            existing.count += 1;
            return;
        }

        folderCounts.set(key, { folder, count: 1 });
    });

    if (folderCounts.size === 0) {
        return getPreferredWorkspaceFolder();
    }

    const activeFolder = getActiveWorkspaceFolder();
    if (activeFolder && folderCounts.has(activeFolder.uri.toString())) {
        return activeFolder;
    }

    return [...folderCounts.values()]
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return getWorkspaceFolderOrder(left.folder) - getWorkspaceFolderOrder(right.folder);
        })[0]?.folder;
}

export function getWorkspaceNameForAnnotations(annotations: readonly Annotation[]): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return 'Unknown Workspace';
    }

    const folderUris = new Set(
        annotations
            .map(annotation => getWorkspaceFolderForFilePath(annotation.filePath)?.uri.toString())
            .filter((uri): uri is string => typeof uri === 'string')
    );

    if (folderUris.size > 1) {
        return 'Multi-root Workspace';
    }

    if (folderUris.size === 1) {
        const folder = resolveWorkspaceFolderForAnnotations(annotations);
        return folder?.name || 'Unknown Workspace';
    }

    return getPreferredWorkspaceFolder()?.name || 'Unknown Workspace';
}

export function findWorkspaceFolderContainingChild(childPath: string): vscode.WorkspaceFolder | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    const activeFolder = getActiveWorkspaceFolder();
    if (activeFolder && fs.existsSync(path.join(activeFolder.uri.fsPath, childPath))) {
        return activeFolder;
    }

    return workspaceFolders.find(folder => fs.existsSync(path.join(folder.uri.fsPath, childPath)));
}