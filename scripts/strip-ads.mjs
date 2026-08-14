/**
 * Strip Google AdSense from the production build for native (Capacitor)
 * builds. AdSense policy forbids placing ads inside native app wrappers, so
 * the native build must ship without the adsbygoogle script; the web build
 * keeps them untouched.
 *
 * Usage: node scripts/strip-ads.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distIndex = join(root, 'dist', 'index.html');

let html = readFileSync(distIndex, 'utf8');

const before = html;

// Remove the adsbygoogle script tag (single-line and multi-line).
html = html.replace(/<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[\s\S]*?<\/script>\s*/gi, '');

// Remove the dns-prefetch for the AdSense domain (unnecessary without ads).
html = html.replace(/<link\s+rel="dns-prefetch"\s+href="https:\/\/pagead2\.googlesyndication\.com"\s*\/?>\s*/gi, '');

if (html === before) {
  console.warn('[strip-ads] No AdSense references found in dist/index.html — nothing to strip.');
} else {
  writeFileSync(distIndex, html);
  console.log('[strip-ads] AdSense scripts removed from dist/index.html');
}
