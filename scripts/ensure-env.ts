/**
 * Environment Synchronization Script
 *
 * Ensures a valid .env file is present locally before development.
 * If .env is missing or empty, downloads environment variables from Netlify.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const isForce = process.argv.includes('--force');

function shouldDownloadEnv(): boolean {
  if (isForce) return true;
  if (!existsSync(envPath)) return true;
  try {
    return statSync(envPath).size === 0;
  } catch {
    return true;
  }
}

export function ensureEnv(): void {
  if (!shouldDownloadEnv()) {
    return;
  }

  console.log('[env] .env file not found or empty. Fetching from Netlify...');

  const commands: [string, string[]][] = [
    ['netlify', ['env:list', '--plain']],
    ['npx', ['--no-install', 'netlify', 'env:list', '--plain']],
  ];

  let output: string | null = null;
  let lastError: string | null = null;

  for (const [cmd, args] of commands) {
    const result = spawnSync(cmd, args, { encoding: 'utf8' });
    if (result.status === 0 && result.stdout?.trim()) {
      output = result.stdout.trim();
      break;
    }
    if (result.stderr) {
      lastError = result.stderr.trim();
    }
  }

  if (output && output.length > 0) {
    writeFileSync(envPath, `${output}\n`, 'utf8');
    console.log('[env] Successfully downloaded and saved environment variables to .env');
  } else {
    console.warn(
      '[env] Warning: Could not download environment from Netlify. Continuing with existing process environment.',
    );
    if (lastError && process.env.DEBUG) {
      console.warn(`[env] Error details: ${lastError}`);
    }
  }
}

if (process.argv[1]?.endsWith('ensure-env.ts')) {
  ensureEnv();
}
