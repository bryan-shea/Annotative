# Migration Guide: v1.5.0 to v2.0.0

This guide helps you upgrade from Annotative v1.5.0 to v2.0.0, which introduces user-defined tags and project-based storage.

## Breaking Changes Overview

### 1. Preset Tags Removed

**What Changed:**

- All preset tags (bug, todo, review, question, refactor, documentation, optimization, security) have been removed
- All tags are now user-defined and created per project
- No tags exist by default in new installations

**Why:**

- Gives teams complete control over their tag system
- Allows customization to match specific workflows
- Eliminates unused preset tags cluttering the interface

### 2. Project-Based Storage

**What Changed:**

- Annotations are now automatically stored in `.annotative/` folder in your workspace root
- First annotation you create automatically initializes project storage
- Global storage has been removed
- All annotations are project-scoped

**Why:**

- Makes it easy to share annotations with your team via version control
- Provides clear separation between different projects
- Eliminates confusion about where annotations are stored

## Migration Steps

### Step 1: Update the Extension

1. Update Annotative to v2.0.0 from the VS Code Marketplace
2. Restart VS Code if prompted

### Step 2: Recreate Your Tag System

Since preset tags no longer exist, you'll need to create custom tags for the ones you were using:

**To create a custom tag:**

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `Annotative: Create Tag`
3. Enter tag name (e.g., "bug", "todo", "review")
4. Select a category and color
5. Repeat for each tag you need

**Suggested tag mappings from v1.5.0 presets:**

| Old Preset    | Suggested Custom Tag | Color            | Category  |
| ------------- | -------------------- | ---------------- | --------- |
| bug           | Bug                  | Red (#FF5252)    | issue     |
| todo          | To-Do                | Orange (#FFA726) | action    |
| review        | Review               | Blue (#42A5F5)   | action    |
| question      | Question             | Purple (#AB47BC) | reference |
| refactor      | Refactor             | Green (#66BB6A)  | action    |
| documentation | Docs                 | Cyan (#26C6DA)   | meta      |
| optimization  | Optimize             | Yellow (#FFEE58) | action    |
| security      | Security             | Red (#FF5252)    | issue     |

**Tip:** You can create tags that better match your team's workflow. You're not limited to the old preset names.

### Step 3: Initialize Project Storage

**For existing annotations:**

If you have existing annotations in global storage from v1.5.0:

1. The first time you add an annotation in v2.0.0, project storage will be automatically created
2. Your existing annotations will continue to work
3. New annotations will be saved to `.annotative/annotations.json`

**Note:** Existing annotations from v1.5.0 may still reference old preset tag names. You can edit these annotations and reassign them to your new custom tags.

### Step 4: Update Existing Annotations

If you have annotations that reference old preset tags:

1. Open the Annotations sidebar
2. For each annotation with old tags:
   - Click the edit button
   - Select your new custom tags
   - Save the annotation
3. The annotation will now use your custom tags

**Bulk approach:**

- You can also delete old annotations and recreate them with new tags
- Use the search feature to find annotations by old tag names

### Step 5: Share with Your Team

Now that annotations are stored in `.annotative/`:

1. Commit the `.annotative/` folder to version control:

   ```bash
   git add .annotative/
   git commit -m "Add project annotations"
   git push
   ```

2. Team members pull the changes and install Annotative v2.0.0
3. They'll automatically see your annotations and custom tags

**Team coordination:**

- Make sure all team members create the same custom tags
- Or, one person creates tags and commits them
- Tags are stored in `.annotative/customTags.json` and shared via git

## Version Control Setup

### Recommended: Include Annotations in Version Control

To share annotations with your team:

```bash
# Add .annotative folder to git
git add .annotative/
```

Your `.annotative/` folder will contain:

- `annotations.json` - All annotations
- `customTags.json` - Your custom tag definitions
- `.gitignore` - Placeholder (can be deleted)

### Optional: Exclude Annotations from Version Control

If you want to keep annotations private:

1. Add to your project's `.gitignore`:

   ```
   .annotative/
   ```

2. Each team member will have their own local annotations

**Note:** Most teams should include annotations in version control to enable collaboration.

## Feature Changes

### Templates Now Prompt for Tags

In v2.0.0, when you use "Add from Template":

1. Select a template (Review Code, Explain, Optimize, etc.)
2. If you have custom tags, you'll be prompted to select them
3. The annotation is created with your comment and selected tags

This makes templates more flexible and useful with your custom tag system.

### No Manual Storage Initialization

You no longer need to run "Initialize Storage":

- Storage is automatically created when you add your first annotation
- The `.annotative/` folder appears in your workspace root
- No configuration required

## Troubleshooting

### I don't see my old annotations

Old annotations from v1.5.0 should still appear. If they don't:

1. Run `Annotative: Storage Info` to see your storage location
2. Check if a `.annotative/` folder exists in your workspace root
3. If annotations are missing, they may be in global storage from v1.5.0

### Tags show as "undefined" or old tag names

Old annotations may reference preset tags that no longer exist:

1. Edit the annotation
2. Select your new custom tags
3. Save the annotation

### My team can't see my tags

Make sure you've committed `.annotative/customTags.json` to version control:

```bash
git add .annotative/customTags.json
git commit -m "Add custom tag definitions"
git push
```

Team members will see your tags after pulling the changes.

### Storage folder not created automatically

If the `.annotative/` folder doesn't appear after adding an annotation:

1. Check that you have a workspace folder open (not just loose files)
2. Ensure you have write permissions in the workspace directory
3. Check the Output panel (View > Output > Annotative) for errors

## FAQ

**Q: Can I use the old preset tag names?**

A: Yes! Create custom tags with the same names (bug, todo, review, etc.). The functionality will be the same.

**Q: Do I need to manually initialize storage?**

A: No. Storage is automatically created when you add your first annotation in v2.0.0.

**Q: Will my old annotations be lost?**

A: No. Existing annotations are preserved. They may reference old tag names, which you can update by editing the annotation.

**Q: Can I share annotations without version control?**

A: Yes, you can manually share the `.annotative/` folder via file sharing, but version control is recommended for team workflows.

**Q: What if I don't want any tags?**

A: Tags are optional. You can create annotations without tags at any time. The tag prompt only appears if you've created custom tags.

**Q: Can different projects have different tags?**

A: Yes! Each project's `.annotative/customTags.json` file contains its own tag definitions. This allows per-project customization.

## Getting Help

If you encounter issues during migration:

1. Check the [README.md](README.md) for updated documentation
2. Review the [CHANGELOG.md](CHANGELOG.md) for all changes
3. Open an issue on [GitHub](https://github.com/bryan-shea/Annotative/issues) with:
   - Your migration steps
   - Error messages
   - Expected vs actual behavior

## Summary

The v2.0.0 upgrade brings:

- More flexibility with user-defined tags
- Simpler project-based storage
- Better team collaboration via version control

The migration requires:

- Creating custom tags to replace presets
- Automatic storage initialization (no action needed)
- Committing `.annotative/` to share with your team

Welcome to Annotative v2.0.0!
