(function () {
    const vscode = acquireVsCodeApi();
    const stateElement = document.getElementById('plan-review-state');
    const root = document.getElementById('plan-review-root');
    const categoryLabels = {
        approve_note: 'Approve Note',
        bug_risk: 'Bug Risk',
        comment: 'Comment',
        follow_up: 'Follow Up',
        maintainability: 'Maintainability',
        performance: 'Performance',
        request_change: 'Request Change',
        missing_step: 'Missing Step',
        risk: 'Risk',
        security: 'Security',
        replacement: 'Replacement',
        suggested_replacement: 'Suggested Replacement',
        test_gap: 'Test Gap',
        question: 'Question',
        global_comment: 'Global Comment'
    };
    const artifactConfigs = {
        plan: {
            eyebrow: 'Persisted Plan Review',
            emptyStateTitle: 'No plan review loaded',
            globalActionLabel: 'Add Global Comment',
            globalHeading: 'Global Comments'
        },
        aiResponse: {
            eyebrow: 'Persisted AI Response Review',
            emptyStateTitle: 'No AI response review loaded',
            globalActionLabel: 'Add Comment',
            globalHeading: 'Artifact Comments'
        },
        localDiff: {
            eyebrow: 'Persisted Local Diff Review',
            emptyStateTitle: 'No local diff review loaded',
            globalActionLabel: 'Add Review Note',
            globalHeading: 'Artifact Notes'
        }
    };
    let artifact = stateElement ? JSON.parse(stateElement.textContent || 'null') : null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(value) {
        if (!value) {
            return 'Unknown';
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    }

    function getBlocks(sectionId) {
        return (artifact.content.blocks || []).filter(function (block) {
            return block.sectionId === sectionId;
        });
    }

    function getAnnotationsForSection(sectionId) {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'section' && annotation.target.sectionId === sectionId;
        });
    }

    function getAnnotationsForBlock(blockId) {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'block' && annotation.target.blockId === blockId;
        });
    }

    function getAnnotationsForDiffFile(diffFileId) {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'diffFile' && annotation.target.diffFileId === diffFileId;
        });
    }

    function getAnnotationsForDiffHunk(diffHunkId) {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'diffHunk' && annotation.target.diffHunkId === diffHunkId;
        });
    }

    function getGlobalAnnotations() {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'artifact';
        });
    }

    function formatAnnotationLabel(annotation) {
        const category = annotation.metadata && annotation.metadata.category;
        return categoryLabels[category] || annotation.kind;
    }

    function getArtifactConfig() {
        if (!artifact) {
            return artifactConfigs.plan;
        }

        return artifactConfigs[artifact.kind] || artifactConfigs.plan;
    }

    function formatTarget(annotation) {
        if (annotation.target.type === 'block' && annotation.target.blockId) {
            return 'Block ' + annotation.target.blockId;
        }
        if (annotation.target.type === 'section' && annotation.target.sectionId) {
            return 'Section ' + annotation.target.sectionId;
        }
        if (annotation.target.type === 'diffFile' && annotation.target.diffFileId) {
            return 'Diff File ' + annotation.target.diffFileId;
        }
        if (annotation.target.type === 'diffHunk' && annotation.target.diffHunkId) {
            return 'Diff Hunk ' + annotation.target.diffHunkId;
        }
        return 'Artifact';
    }

    function renderAnnotation(annotation) {
        return [
            '<article class="annotation-card">',
            '<div class="annotation-card__header">',
            '<div>',
            '<span class="badge badge--category">' + escapeHtml(formatAnnotationLabel(annotation)) + '</span>',
            annotation.severity ? '<span class="badge badge--severity">' + escapeHtml(annotation.severity) + '</span>' : '',
            '</div>',
            '<span class="annotation-status annotation-status--' + escapeHtml(annotation.status) + '">' + escapeHtml(annotation.status) + '</span>',
            '</div>',
            '<p class="annotation-body">' + escapeHtml(annotation.body) + '</p>',
            annotation.suggestedReplacement ? '<pre class="annotation-replacement">' + escapeHtml(annotation.suggestedReplacement) + '</pre>' : '',
            '<div class="annotation-meta">',
            '<span>' + escapeHtml(formatTarget(annotation)) + '</span>',
            '<span>' + escapeHtml(formatDate(annotation.updatedAt)) + '</span>',
            '</div>',
            '<div class="annotation-actions">',
            '<button class="secondary" data-command="editAnnotation" data-annotation-id="' + escapeHtml(annotation.id) + '">Edit</button>',
            '<button class="secondary" data-command="toggleAnnotationStatus" data-annotation-id="' + escapeHtml(annotation.id) + '">Toggle Status</button>',
            '<button class="danger" data-command="deleteAnnotation" data-annotation-id="' + escapeHtml(annotation.id) + '">Remove</button>',
            '</div>',
            '</article>'
        ].join('');
    }

    function renderBlock(block) {
        const annotations = getAnnotationsForBlock(block.id);
        return [
            '<div class="block-card">',
            '<div class="block-card__header">',
            '<div>',
            '<span class="badge">' + escapeHtml(block.kind) + '</span>',
            '<span class="block-lines">Lines ' + escapeHtml(block.lineStart || '?') + '-' + escapeHtml(block.lineEnd || '?') + '</span>',
            '</div>',
            '<button class="secondary" data-command="addAnnotation" data-target-type="block" data-block-id="' + escapeHtml(block.id) + '" data-section-id="' + escapeHtml(block.sectionId || '') + '" data-line-start="' + escapeHtml(block.lineStart || '') + '" data-line-end="' + escapeHtml(block.lineEnd || '') + '">Add Annotation</button>',
            '</div>',
            '<pre class="block-content">' + escapeHtml(block.content) + '</pre>',
            annotations.length > 0 ? '<div class="annotation-list">' + annotations.map(renderAnnotation).join('') + '</div>' : '',
            '</div>'
        ].join('');
    }

    function renderSection(section) {
        const blocks = getBlocks(section.id);
        const annotations = getAnnotationsForSection(section.id);
        return [
            '<section class="section-card">',
            '<div class="section-card__header">',
            '<div>',
            '<h2>' + escapeHtml(section.heading || 'Overview') + '</h2>',
            '<p class="section-meta">Lines ' + escapeHtml(section.lineStart || '?') + '-' + escapeHtml(section.lineEnd || '?') + ' • ' + escapeHtml(blocks.length) + ' blocks</p>',
            '</div>',
            '<div class="section-actions">',
            '<button class="secondary" data-command="openSource" data-line-start="' + escapeHtml(section.lineStart || '') + '" data-line-end="' + escapeHtml(section.lineEnd || '') + '">Open Source</button>',
            '<button class="primary" data-command="addAnnotation" data-target-type="section" data-section-id="' + escapeHtml(section.id) + '" data-line-start="' + escapeHtml(section.lineStart || '') + '" data-line-end="' + escapeHtml(section.lineEnd || '') + '">Add Annotation</button>',
            '</div>',
            '</div>',
            '<pre class="section-content">' + escapeHtml(section.content) + '</pre>',
            annotations.length > 0 ? '<div class="annotation-list">' + annotations.map(renderAnnotation).join('') + '</div>' : '',
            '<div class="block-list">' + blocks.map(renderBlock).join('') + '</div>',
            '</section>'
        ].join('');
    }

    function getSourceBasePath() {
        if (!artifact || !artifact.source) {
            return '';
        }

        return String(
            (artifact.source.metadata && artifact.source.metadata.repositoryRoot)
            || artifact.source.workspaceFolder
            || ''
        );
    }

    function getDiffSourcePath(diffFile) {
        if (diffFile.status === 'deleted') {
            return diffFile.oldPath || diffFile.newPath || '';
        }

        return diffFile.newPath || diffFile.oldPath || '';
    }

    function getDiffOpenRange(diffFile, hunk) {
        if (!hunk) {
            const firstHunk = diffFile.hunks && diffFile.hunks.length > 0 ? diffFile.hunks[0] : undefined;
            if (!firstHunk) {
                return { lineStart: 1, lineEnd: 1 };
            }

            return getDiffOpenRange(diffFile, firstHunk);
        }

        const usesOldRange = diffFile.status === 'deleted';
        const lineStart = usesOldRange ? hunk.oldStart : hunk.newStart;
        const lineCount = usesOldRange ? hunk.oldLines : hunk.newLines;
        return {
            lineStart: lineStart || 1,
            lineEnd: Math.max(lineStart || 1, (lineStart || 1) + Math.max((lineCount || 1) - 1, 0))
        };
    }

    function renderDiffLines(hunk) {
        return hunk.lines.map(function (line) {
            const prefix = line.type === 'add' ? '+' : (line.type === 'delete' ? '-' : ' ');
            return prefix + line.content;
        }).join('\n');
    }

    function renderDiffHunk(diffFile, hunk) {
        const annotations = getAnnotationsForDiffHunk(hunk.id);
        const sourcePath = getDiffSourcePath(diffFile);
        const sourceBasePath = getSourceBasePath();
        const range = getDiffOpenRange(diffFile, hunk);

        return [
            '<div class="block-card diff-hunk-card">',
            '<div class="block-card__header">',
            '<div>',
            '<span class="badge">Hunk</span>',
            '<span class="block-lines">' + escapeHtml(hunk.header) + '</span>',
            '</div>',
            '<div class="section-actions">',
            sourcePath ? '<button class="secondary" data-command="openSource" data-source-path="' + escapeHtml(sourcePath) + '" data-source-base-path="' + escapeHtml(sourceBasePath) + '" data-line-start="' + escapeHtml(range.lineStart) + '" data-line-end="' + escapeHtml(range.lineEnd) + '">Open Source</button>' : '',
            '<button class="primary" data-command="addAnnotation" data-target-type="diffHunk" data-diff-file-id="' + escapeHtml(diffFile.id) + '" data-diff-hunk-id="' + escapeHtml(hunk.id) + '" data-line-start="' + escapeHtml(range.lineStart) + '" data-line-end="' + escapeHtml(range.lineEnd) + '">Add Annotation</button>',
            '</div>',
            '</div>',
            '<pre class="block-content diff-code">' + escapeHtml(renderDiffLines(hunk)) + '</pre>',
            annotations.length > 0 ? '<div class="annotation-list">' + annotations.map(renderAnnotation).join('') + '</div>' : '',
            '</div>'
        ].join('');
    }

    function renderDiffFile(diffFile) {
        const annotations = getAnnotationsForDiffFile(diffFile.id);
        const sourcePath = getDiffSourcePath(diffFile);
        const sourceBasePath = getSourceBasePath();
        const range = getDiffOpenRange(diffFile);
        const metadata = diffFile.metadata || {};

        return [
            '<section class="section-card diff-file-card">',
            '<div class="section-card__header">',
            '<div>',
            '<h2>' + escapeHtml(diffFile.newPath || diffFile.oldPath || diffFile.id) + '</h2>',
            '<p class="section-meta">Status ' + escapeHtml(diffFile.status) + ' • ' + escapeHtml(metadata.hunkCount || diffFile.hunks.length) + ' hunks • +' + escapeHtml(metadata.addedLineCount || 0) + ' / -' + escapeHtml(metadata.deletedLineCount || 0) + '</p>',
            '</div>',
            '<div class="section-actions">',
            sourcePath ? '<button class="secondary" data-command="openSource" data-source-path="' + escapeHtml(sourcePath) + '" data-source-base-path="' + escapeHtml(sourceBasePath) + '" data-line-start="' + escapeHtml(range.lineStart) + '" data-line-end="' + escapeHtml(range.lineEnd) + '">Open Source</button>' : '',
            '<button class="primary" data-command="addAnnotation" data-target-type="diffFile" data-diff-file-id="' + escapeHtml(diffFile.id) + '">Add Annotation</button>',
            '</div>',
            '</div>',
            '<div class="diff-file-meta">',
            '<span class="badge badge--category">' + escapeHtml(diffFile.status) + '</span>',
            '<span class="block-lines">Old ' + escapeHtml(diffFile.oldPath || 'n/a') + '</span>',
            '<span class="block-lines">New ' + escapeHtml(diffFile.newPath || 'n/a') + '</span>',
            '</div>',
            annotations.length > 0 ? '<div class="annotation-list">' + annotations.map(renderAnnotation).join('') + '</div>' : '',
            '<div class="block-list">' + diffFile.hunks.map(function (hunk) { return renderDiffHunk(diffFile, hunk); }).join('') + '</div>',
            '</section>'
        ].join('');
    }

    function buildStatCards(config) {
        if (artifact.kind === 'localDiff') {
            const diffFiles = artifact.content.diffFiles || [];
            const hunkCount = diffFiles.reduce(function (count, diffFile) {
                return count + diffFile.hunks.length;
            }, 0);

            return [
                { label: 'Diff Files', value: diffFiles.length },
                { label: 'Hunks', value: hunkCount },
                { label: 'Annotations', value: artifact.annotations.length },
                { label: 'Open', value: artifact.annotations.filter(function (annotation) { return annotation.status === 'open'; }).length },
                { label: 'Exports', value: artifact.exportState && artifact.exportState.exports ? artifact.exportState.exports.length : 0 }
            ];
        }

        return [
            { label: 'Sections', value: (artifact.content.sections || []).length },
            { label: 'Blocks', value: (artifact.content.blocks || []).length },
            { label: 'Annotations', value: artifact.annotations.length },
            { label: 'Open', value: artifact.annotations.filter(function (annotation) { return annotation.status === 'open'; }).length },
            { label: 'Exports', value: artifact.exportState && artifact.exportState.exports ? artifact.exportState.exports.length : 0 }
        ];
    }

    function render() {
        const config = getArtifactConfig();

        if (!artifact) {
            root.innerHTML = '<div class="empty-state"><h1>' + escapeHtml(config.emptyStateTitle) + '</h1></div>';
            return;
        }

        const sections = artifact.content.sections || [];
        const diffFiles = artifact.content.diffFiles || [];
        const globalAnnotations = getGlobalAnnotations();
        const statCards = buildStatCards(config);

        root.innerHTML = [
            '<main class="page">',
            '<header class="hero">',
            '<div>',
            '<p class="eyebrow">' + escapeHtml(config.eyebrow) + '</p>',
            '<h1>' + escapeHtml(artifact.title) + '</h1>',
            '<p class="hero-meta">Updated ' + escapeHtml(formatDate(artifact.updatedAt)) + ' • Source ' + escapeHtml(artifact.source.type) + '</p>',
            '</div>',
            '<div class="hero-actions">',
            '<button class="primary" data-command="addAnnotation" data-target-type="artifact">' + escapeHtml(config.globalActionLabel) + '</button>',
            '<button class="secondary" data-command="exportArtifact" data-export-target="clipboard">Export to Clipboard</button>',
            '<button class="secondary" data-command="exportArtifact" data-export-target="document">Export to Document</button>',
            '<button class="secondary" data-command="refresh">Refresh</button>',
            artifact.source.uri && artifact.source.uri.indexOf('file:') === 0 ? '<button class="secondary" data-command="openSource" data-line-start="1" data-line-end="1">Open Source</button>' : '',
            '</div>',
            '</header>',
            '<section class="stats-grid">' + statCards.map(function (card) {
                return '<article class="stat-card"><span class="stat-label">' + escapeHtml(card.label) + '</span><strong>' + escapeHtml(card.value) + '</strong></article>';
            }).join('') + '</section>',
            globalAnnotations.length > 0 ? '<section class="global-annotations"><h2>' + escapeHtml(config.globalHeading) + '</h2><div class="annotation-list">' + globalAnnotations.map(renderAnnotation).join('') + '</div></section>' : '',
            artifact.kind === 'localDiff'
                ? '<section class="sections">' + diffFiles.map(renderDiffFile).join('') + '</section>'
                : '<section class="sections">' + sections.map(renderSection).join('') + '</section>',
            '</main>'
        ].join('');
    }

    window.addEventListener('message', function (event) {
        if (event.data && event.data.command === 'updateArtifact') {
            artifact = event.data.artifact;
            render();
        }
    });

    document.addEventListener('click', function (event) {
        const button = event.target.closest('[data-command]');
        if (!button) {
            return;
        }

        const message = {
            command: button.getAttribute('data-command'),
            annotationId: button.getAttribute('data-annotation-id') || undefined,
            exportTarget: button.getAttribute('data-export-target') || undefined,
            targetType: button.getAttribute('data-target-type') || undefined,
            sectionId: button.getAttribute('data-section-id') || undefined,
            blockId: button.getAttribute('data-block-id') || undefined,
            diffFileId: button.getAttribute('data-diff-file-id') || undefined,
            diffHunkId: button.getAttribute('data-diff-hunk-id') || undefined,
            lineStart: button.getAttribute('data-line-start') ? Number(button.getAttribute('data-line-start')) : undefined,
            lineEnd: button.getAttribute('data-line-end') ? Number(button.getAttribute('data-line-end')) : undefined,
            sourcePath: button.getAttribute('data-source-path') || undefined,
            sourceBasePath: button.getAttribute('data-source-base-path') || undefined
        };

        vscode.postMessage(message);
    });

    render();
}());