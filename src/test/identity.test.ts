import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('the reused gate refuses a corporate author and a corporate committer independently', () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const good = '226608806+ppvaz@users.noreply.github.com';
  for (const role of ['AUTHOR', 'COMMITTER']) {
    const result = spawnSync(process.execPath, ['tools/commit-identity.ts', '--hook'], { encoding: 'utf8',
      env: { ...env, GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: role === 'AUTHOR' ? 'fixture@company.example' : good,
        GIT_COMMITTER_EMAIL: role === 'COMMITTER' ? 'fixture@company.example' : good } });
    assert.equal(result.status, 1); assert.match(result.stderr, /not GitHub's noreply form/);
  }
});
test('a real commit-msg hook refuses --author and history/pre-push catch commits made without installed hooks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'operator-identity-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const git = (args: string[]) => execFileSync('git', args, { cwd: directory, env, encoding: 'utf8', stdio: 'pipe' });
  const gate = resolve('tools/commit-identity.ts');
  try {
    git(['init', '-b', 'main']); git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@users.noreply.github.com']);
    git(['config', 'core.hooksPath', resolve('.githooks')]);
    const refused = spawnSync('git', ['commit', '--allow-empty', '--author', 'Fixture <fixture@company.example>', '-m', 'refused'], { cwd: directory, env, encoding: 'utf8' });
    assert.equal(refused.status, 1);
    git(['commit', '--allow-empty', '-m', 'valid']);
    const valid = spawnSync(process.execPath, [gate, '--history'], { cwd: directory, env, encoding: 'utf8' }); assert.equal(valid.status, 0);
    // Model a clean clone with hooks uninstalled. No bypass flags are used.
    git(['config', 'core.hooksPath', '.git/hooks']); git(['config', 'user.email', 'fixture@company.example']);
    git(['commit', '--allow-empty', '-m', 'uninstalled-hooks-fixture']);
    const history = spawnSync(process.execPath, [gate, '--history'], { cwd: directory, env, encoding: 'utf8' }); assert.equal(history.status, 1);
    const sha = git(['rev-parse', 'HEAD']).trim();
    const pushed = spawnSync(process.execPath, [gate, '--push'], { cwd: directory, env, encoding: 'utf8',
      input: `refs/heads/main ${sha} refs/heads/main ${'0'.repeat(40)}\n` }); assert.equal(pushed.status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
