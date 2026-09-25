import { spawnSync } from 'node:child_process';

const files = spawnSync('git', ['ls-files', '*.sh'], { encoding: 'utf8' });

if (files.error) {
  throw files.error;
}

if (files.status !== 0) {
  process.exit(files.status ?? 1);
}

const shellFiles = files.stdout.trim().split('\n').filter(Boolean);

if (shellFiles.length === 0) {
  console.log('No tracked shell scripts to check.');
  process.exit(0);
}

const version = spawnSync('shellcheck', ['--version'], { stdio: 'ignore' });

if (version.error || version.status !== 0) {
  console.error('ShellCheck is required when tracked shell scripts exist.');
  process.exit(1);
}

const result = spawnSync('shellcheck', shellFiles, { stdio: 'inherit' });
process.exit(result.status ?? 1);
