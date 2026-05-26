/**
 * Extracted from src/main/main.ts — scanProject with no Electron dependency.
 */

import path from 'node:path';
import fs from 'node:fs';

export type ProjectSnapshot = {
  filesFound: string[];
  majorSourceFolders: string[];
  totalFileCount: number;
  frameworks: string[];
  buildSystems: string[];
  entryPoints: string[];
  approxProjectSize: string;
  detectedTypes: string[];
  lastScanTime: string;
};

const WANTED_FILES = [
  'package.json', 'build.gradle', 'settings.gradle', 'gradle.properties',
  'AndroidManifest.xml', 'README.md', 'tsconfig.json',
  'vite.config.ts', 'vite.config.js', 'electron-builder.json',
  'electron.vite.config.ts',
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out']);

export const scanProject = (rootPath: string): ProjectSnapshot => {
  const found = new Set<string>();
  const folders = new Set<string>();
  const extCount = new Map<string, number>();
  let total = 0;
  let size = 0;

  const topEntries = fs.existsSync(rootPath) ? fs.readdirSync(rootPath, { withFileTypes: true }) : [];
  topEntries.forEach((e) => { if (e.isDirectory()) folders.add(e.name); });

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full);
      } else {
        total += 1;
        try { size += fs.statSync(full).size; } catch { /* ignore stat errors */ }
        const ext = path.extname(e.name).toLowerCase();
        extCount.set(ext, (extCount.get(ext) || 0) + 1);
        if (WANTED_FILES.includes(e.name)) found.add(path.relative(rootPath, full));
      }
    }
  };

  if (fs.existsSync(rootPath)) walk(rootPath);

  const frameworks: string[] = [];
  const buildSystems: string[] = [];
  const entryPoints: string[] = [];
  const detectedTypes: string[] = [];
  const has = (name: string) => Array.from(found).some((f) => f.endsWith(name));

  if (has('package.json')) { frameworks.push('Node'); buildSystems.push('npm'); detectedTypes.push('Node'); }
  if (has('vite.config.ts') || has('vite.config.js')) frameworks.push('Vite');
  if (has('tsconfig.json')) { frameworks.push('TypeScript'); detectedTypes.push('TypeScript'); }
  if (has('build.gradle') || has('settings.gradle')) { buildSystems.push('Gradle'); detectedTypes.push('Android'); }
  if (has('AndroidManifest.xml')) frameworks.push('Android');
  if (has('electron.vite.config.ts') || has('electron-builder.json') || has('main.ts')) detectedTypes.push('Electron');
  if ((extCount.get('.tsx') || 0) > 0 || (extCount.get('.jsx') || 0) > 0) detectedTypes.push('React');
  if ((extCount.get('.kt') || 0) > 0) detectedTypes.push('Kotlin');
  if ((extCount.get('.py') || 0) > 0) detectedTypes.push('Python');
  if (has('.toc')) detectedTypes.push('WoW Addon');
  if (has('package.json')) entryPoints.push('package.json scripts');
  if (has('AndroidManifest.xml')) entryPoints.push('AndroidManifest.xml');

  return {
    filesFound: Array.from(found).sort(),
    majorSourceFolders: Array.from(folders).slice(0, 12),
    totalFileCount: total,
    frameworks: Array.from(new Set(frameworks)),
    buildSystems: Array.from(new Set(buildSystems)),
    entryPoints,
    approxProjectSize: `${(size / (1024 * 1024)).toFixed(2)} MB`,
    detectedTypes: Array.from(new Set(detectedTypes)),
    lastScanTime: new Date().toISOString(),
  };
};
