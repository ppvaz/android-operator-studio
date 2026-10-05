import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, env });
for (const name of ['commit-msg', 'pre-push']) chmodSync(resolve(root, '.githooks', name), 0o755);
console.log('Hooks ativos. Autor e committer devem usar email GitHub noreply.');
