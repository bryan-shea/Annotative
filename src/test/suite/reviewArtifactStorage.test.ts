import * as assert from 'assert';
import * as fs from 'fs/promises';
import { ReviewArtifactStorageFile } from '../../types';
import { ReviewArtifactStorageManager } from '../../managers';
import {
    clearTestWorkspace,
    createReviewAnnotation,
    createReviewArtifact,
    getReviewStoragePaths,
    getWorkspaceRoot,
    readJson,
    readReviewArtifactFixture,
} from './testUtils';

suite('ReviewArtifactStorageManager', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('round-trips review artifacts under .annotative/reviews', async () => {
        const planText = await readReviewArtifactFixture('plan-basic.md');
        const storage = new ReviewArtifactStorageManager();
        const artifact = createReviewArtifact({
            id: 'plan-artifact',
            title: 'Review API Migration Plan',
            source: {
                type: 'markdownFile',
                uri: 'file:///workspace/docs/plan-basic.md',
                workspaceFolder: getWorkspaceRoot(),
            },
            content: {
                rawText: planText,
                sections: [
                    {
                        id: 'goal',
                        heading: 'Goal',
                        level: 2,
                        order: 1,
                        content: 'Move review artifact persistence into project-local storage without breaking existing annotations.',
                        lineStart: 3,
                        lineEnd: 4,
                    },
                ],
            },
            annotations: [
                createReviewAnnotation({
                    id: 'plan-annotation',
                    target: { type: 'section', sectionId: 'goal' },
                    body: 'Confirm that legacy annotation storage is unaffected.',
                }),
            ],
        });
        const { artifactPath } = getReviewStoragePaths(artifact.id);

        await storage.saveArtifact(artifact);

        const loaded = await storage.loadArtifact(artifact.id);
        const listed = await storage.listArtifacts();
        const storedFile = await readJson<ReviewArtifactStorageFile>(artifactPath!);

        assert.strictEqual(loaded.needsSave, false);
        assert.deepStrictEqual(loaded.artifact, artifact);
        assert.deepStrictEqual(listed.needsSaveIds, []);
        assert.strictEqual(listed.artifacts.length, 1);
        assert.deepStrictEqual(listed.artifacts[0], artifact);
        assert.strictEqual(storedFile.schemaVersion, 1);
        assert.deepStrictEqual(storedFile.artifact, artifact);
    });

    test('quarantines unreadable review artifact files during listing', async () => {
        const storage = new ReviewArtifactStorageManager();
        const { reviewsDir } = getReviewStoragePaths();

        await storage.ensureProjectStorage();
        await fs.writeFile(`${reviewsDir}/broken.json`, '{ invalid json', 'utf-8');

        const result = await storage.listArtifacts();
        const entries = await fs.readdir(reviewsDir);

        assert.deepStrictEqual(result.artifacts, []);
        assert.deepStrictEqual(result.needsSaveIds, []);
        assert.ok(
            entries.some(name => /^broken\.corrupt-.*\.json$/.test(name)),
            'Expected a quarantined copy of the corrupt review artifact file.'
        );
        assert.ok(!entries.includes('broken.json'));
    });
});