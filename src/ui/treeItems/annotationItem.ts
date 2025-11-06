import * as vscode from 'vscode';
import { Annotation } from '../../types';

/**
 * Tree item representing an individual annotation
 */
export class AnnotationItem extends vscode.TreeItem {
    constructor(
        public readonly annotation: Annotation,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false
    ) {
        const statusIcon = annotation.resolved ? '✓' : '○';
        const selectedIcon = isSelected ? '☑ ' : '☐ ';
        const preview = annotation.comment.length > 45
            ? annotation.comment.substring(0, 42) + '...'
            : annotation.comment;
        const tagsLabel = annotation.tags && annotation.tags.length > 0 ? ` [${annotation.tags.join(', ')}]` : '';

        super(`${selectedIcon}${statusIcon} Line ${annotation.range.start.line + 1}: ${preview}${tagsLabel}`, collapsibleState);

        const statusText = annotation.resolved ? 'Resolved' : 'Open';
        this.tooltip = `${annotation.comment}\n\nStatus: ${statusText}\nAuthor: ${annotation.author}\nDate: ${annotation.timestamp.toLocaleString()}`;
        this.description = annotation.author;
        this.contextValue = annotation.resolved ? 'resolvedAnnotation' : 'unresolvedAnnotation';
        this.iconPath = this.getIconPath();

        // Command to navigate to the annotation
        this.command = {
            command: 'annotative.goToAnnotation',
            title: 'Go to Annotation',
            arguments: [annotation]
        };
    }

    private getIconPath(): vscode.ThemeIcon {
        if (this.annotation.resolved) {
            return new vscode.ThemeIcon('check-all', new vscode.ThemeColor('testing.iconPassed'));
        }
        return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconQueued'));
    }
}
