(function () {
    const vscode = acquireVsCodeApi();
    const stateElement = document.getElementById('plan-review-state');
    const root = document.getElementById('plan-review-root');
    const categoryLabels = {
        approve_note: 'Approve Note',
        request_change: 'Request Change',
        missing_step: 'Missing Step',
        risk: 'Risk',
        replacement: 'Replacement',
        global_comment: 'Global Comment'
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

    function getGlobalAnnotations() {
        return artifact.annotations.filter(function (annotation) {
            return annotation.target.type === 'artifact';
        });
    }

    function formatAnnotationLabel(annotation) {
        const category = annotation.metadata && annotation.metadata.category;
        return categoryLabels[category] || annotation.kind;
    }

    function formatTarget(annotation) {
        if (annotation.target.type === 'block' && annotation.target.blockId) {
            return 'Block ' + annotation.target.blockId;
        }
        if (annotation.target.type === 'section' && annotation.target.sectionId) {
            return 'Section ' + annotation.target.sectionId;
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

    function render() {
        if (!artifact) {
            root.innerHTML = '<div class="empty-state"><h1>No plan review loaded</h1></div>';
            return;
        }

        const sections = artifact.content.sections || [];
        const blocks = artifact.content.blocks || [];
        const globalAnnotations = getGlobalAnnotations();
        const exportCount = artifact.exportState && artifact.exportState.exports ? artifact.exportState.exports.length : 0;
        const openCount = artifact.annotations.filter(function (annotation) {
            return annotation.status === 'open';
        }).length;

        root.innerHTML = [
            '<main class="page">',
            '<header class="hero">',
            '<div>',
            '<p class="eyebrow">Persisted Plan Review</p>',
            '<h1>' + escapeHtml(artifact.title) + '</h1>',
            '<p class="hero-meta">Updated ' + escapeHtml(formatDate(artifact.updatedAt)) + ' • Source ' + escapeHtml(artifact.source.type) + '</p>',
            '</div>',
            '<div class="hero-actions">',
            '<button class="primary" data-command="addAnnotation" data-target-type="artifact">Add Global Comment</button>',
            '<button class="secondary" data-command="exportArtifact" data-export-target="clipboard">Export to Clipboard</button>',
            '<button class="secondary" data-command="exportArtifact" data-export-target="document">Export to Document</button>',
            '<button class="secondary" data-command="refresh">Refresh</button>',
            artifact.source.uri && artifact.source.uri.indexOf('file:') === 0 ? '<button class="secondary" data-command="openSource" data-line-start="1" data-line-end="1">Open Source</button>' : '',
            '</div>',
            '</header>',
            '<section class="stats-grid">',
            '<article class="stat-card"><span class="stat-label">Sections</span><strong>' + escapeHtml(sections.length) + '</strong></article>',
            '<article class="stat-card"><span class="stat-label">Blocks</span><strong>' + escapeHtml(blocks.length) + '</strong></article>',
            '<article class="stat-card"><span class="stat-label">Annotations</span><strong>' + escapeHtml(artifact.annotations.length) + '</strong></article>',
            '<article class="stat-card"><span class="stat-label">Open</span><strong>' + escapeHtml(openCount) + '</strong></article>',
            '<article class="stat-card"><span class="stat-label">Exports</span><strong>' + escapeHtml(exportCount) + '</strong></article>',
            '</section>',
            globalAnnotations.length > 0 ? '<section class="global-annotations"><h2>Global Comments</h2><div class="annotation-list">' + globalAnnotations.map(renderAnnotation).join('') + '</div></section>' : '',
            '<section class="sections">' + sections.map(renderSection).join('') + '</section>',
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
            lineStart: button.getAttribute('data-line-start') ? Number(button.getAttribute('data-line-start')) : undefined,
            lineEnd: button.getAttribute('data-line-end') ? Number(button.getAttribute('data-line-end')) : undefined
        };

        vscode.postMessage(message);
    });

    render();
}());