# Migration Guide for v3.0.2

This branch prepares Annotative `v3.0.2`.

For most current users, `v3.0.2` is an in-place upgrade over `v2.x`. The project storage model stays the same, and there is no new manual migration step for existing `.annotative/` data.

## Who Needs to Do What

### Upgrading from v2.x

No manual storage migration is required.

Recommended steps:

1. Update the extension to `v3.0.2`.
1. Open a folder or workspace, not loose files.
1. Confirm `.annotative/annotations.json` and `.annotative/customTags.json` are still present.
1. Open the `Annotations` sidebar and verify annotations, tags, and exports behave as expected.
1. Commit any resulting storage normalization changes if you track `.annotative/` in version control.

What changes in `v3.0.2`:

- Storage writes are more defensive
- Annotation anchoring is more resilient to nearby source edits
- Export handling is cleaner and more consistent
- The release workflow now auto-tags the validated `main` commit and publishes after CI passes

### Upgrading from v1.5.x or Earlier

If you are still on the pre-`v2` model, you still need the legacy migration path:

- Preset tags are gone
- Storage is project-based in `.annotative/`
- Legacy global-state annotations are not imported automatically

Recommended steps:

1. Install `v3.0.2`.
2. Recreate the custom tags you want to keep.
3. Initialize project storage with `Annotative: Initialize Storage`, or let the first save create `.annotative/`.
4. Recreate or manually migrate any legacy annotations into `.annotative/annotations.json`.
5. Commit `.annotative/` if you want the project to share annotations and tags.

## Storage Expectations in v3.0.2

Annotative stores project data in:

- `.annotative/annotations.json`
- `.annotative/customTags.json`

The folder is created automatically when needed. You can also create it explicitly with `Annotative: Initialize Storage`.

If you want to share annotations with the team, keep `.annotative/` in version control. If you want private local annotations, ignore that folder.

## Recommended Upgrade Checklist

1. Back up `.annotative/` before a major upgrade.
2. Install or build `v3.0.2`.
3. Open the project in a proper workspace.
4. Verify annotations, tags, sidebar grouping, and exports.
5. Run `Annotative: Storage Info` if you need to confirm the active storage path.

## Troubleshooting

### Storage does not initialize

Annotative needs an open folder or workspace for project storage. If initialization fails:

1. Open the project as a folder or workspace.
2. Run `Annotative: Initialize Storage` again.
3. Check that VS Code can write to the workspace directory.

### Old annotations from pre-v2 do not appear

That is expected. Legacy global-state data is not imported automatically. Recreate or manually migrate the data into `.annotative/annotations.json`.

### Tags no longer match legacy preset names

Create custom tags that match your workflow, then re-save the affected annotations.

## Help

If the upgrade does not behave as expected:

1. Review [README.md](README.md).
2. Review [CHANGELOG.md](CHANGELOG.md).
3. Open an issue at <https://github.com/bryan-shea/Annotative/issues> with your version, workspace setup, and the exact failure.
