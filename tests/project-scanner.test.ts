/**
 * Suite 3: Project Scanner
 *
 * Uses real temporary directories (no mocking) to verify that scanProject
 * correctly detects frameworks, file counts, entry points, and edge cases.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { scanProject } from '../src/lib/projectScanner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kcx-scanner-test-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/** Create a file inside tempDir, making parent dirs as needed. */
const create = (relPath: string, content = '') => {
  const full = path.join(tempDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

describe('scanProject — framework detection', () => {
  test('detects Node + TypeScript from package.json + tsconfig.json', () => {
    create('package.json', '{"name":"test","version":"1.0.0"}');
    create('tsconfig.json', '{}');
    create('src/index.ts', 'export const x = 1;');

    const snapshot = scanProject(tempDir);
    expect(snapshot.frameworks).toContain('Node');
    expect(snapshot.frameworks).toContain('TypeScript');
    expect(snapshot.buildSystems).toContain('npm');
    expect(snapshot.detectedTypes).toContain('Node');
    expect(snapshot.detectedTypes).toContain('TypeScript');
  });

  test('detects Vite from vite.config.ts', () => {
    create('package.json', '{}');
    create('vite.config.ts', 'export default {}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.frameworks).toContain('Vite');
  });

  test('detects Vite from vite.config.js', () => {
    create('package.json', '{}');
    create('vite.config.js', 'module.exports = {}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.frameworks).toContain('Vite');
  });

  test('detects React from .tsx files', () => {
    create('package.json', '{}');
    create('src/App.tsx', 'export const App = () => null;');

    const snapshot = scanProject(tempDir);
    expect(snapshot.detectedTypes).toContain('React');
  });

  test('detects React from .jsx files', () => {
    create('package.json', '{}');
    create('src/App.jsx', 'function App() { return null; }');

    const snapshot = scanProject(tempDir);
    expect(snapshot.detectedTypes).toContain('React');
  });

  test('detects Android from AndroidManifest.xml + build.gradle', () => {
    create('app/src/main/AndroidManifest.xml', '<manifest package="com.kcx.test" />');
    create('build.gradle', 'android { compileSdk 34 }');

    const snapshot = scanProject(tempDir);
    expect(snapshot.frameworks).toContain('Android');
    expect(snapshot.buildSystems).toContain('Gradle');
    expect(snapshot.detectedTypes).toContain('Android');
  });

  test('detects Electron from electron-builder.json', () => {
    create('package.json', '{}');
    create('electron-builder.json', '{"appId":"com.kcx.app"}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.detectedTypes).toContain('Electron');
  });

  test('detects Kotlin from .kt files', () => {
    create('app/src/main/kotlin/Main.kt', 'fun main() {}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.detectedTypes).toContain('Kotlin');
  });

  test('detects Python from .py files', () => {
    create('main.py', 'print("hello")');

    const snapshot = scanProject(tempDir);
    expect(snapshot.detectedTypes).toContain('Python');
  });

  test('detects multiple frameworks in a full-stack project', () => {
    create('package.json', '{}');
    create('vite.config.ts', 'export default {}');
    create('tsconfig.json', '{}');
    create('src/App.tsx', 'export const App = () => null;');
    create('electron-builder.json', '{}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.frameworks).toContain('Node');
    expect(snapshot.frameworks).toContain('Vite');
    expect(snapshot.frameworks).toContain('TypeScript');
    expect(snapshot.detectedTypes).toContain('React');
    expect(snapshot.detectedTypes).toContain('Electron');
  });
});

// ---------------------------------------------------------------------------
// File counting
// ---------------------------------------------------------------------------

describe('scanProject — file counts', () => {
  test('counts source files correctly', () => {
    create('a.ts', '');
    create('b.ts', '');
    create('src/c.ts', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(3);
  });

  test('excludes node_modules from file count', () => {
    create('src/app.ts', '// main app');
    create('node_modules/some-pkg/index.js', 'module.exports = {}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(1);
  });

  test('excludes dist from file count', () => {
    create('src/app.ts', '');
    create('dist/bundle.js', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(1);
  });

  test('excludes .git from file count', () => {
    create('src/app.ts', '');
    create('.git/HEAD', 'ref: refs/heads/main');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(1);
  });

  test('excludes build and out directories', () => {
    create('src/app.ts', '');
    create('build/output.js', '');
    create('out/bundle.js', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(1);
  });

  test('counts nested files recursively', () => {
    create('src/a/b/c/deep.ts', '');
    create('src/a/b/other.ts', '');
    create('index.ts', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(3);
  });

  test('returns zero count for empty directory', () => {
    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

describe('scanProject — entry points', () => {
  test('lists package.json scripts as entry point', () => {
    create('package.json', '{"scripts":{"build":"vite build","dev":"vite"}}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.entryPoints).toContain('package.json scripts');
  });

  test('lists AndroidManifest.xml as entry point', () => {
    create('app/src/main/AndroidManifest.xml', '<manifest />');

    const snapshot = scanProject(tempDir);
    expect(snapshot.entryPoints).toContain('AndroidManifest.xml');
  });

  test('returns empty entry points for project with no known entry files', () => {
    create('src/helper.ts', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.entryPoints).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Major source folders
// ---------------------------------------------------------------------------

describe('scanProject — major source folders', () => {
  test('lists top-level directories as major source folders', () => {
    create('src/index.ts', '');
    create('tests/test.ts', '');
    create('docs/readme.txt', '');

    const snapshot = scanProject(tempDir);
    expect(snapshot.majorSourceFolders).toContain('src');
    expect(snapshot.majorSourceFolders).toContain('tests');
    expect(snapshot.majorSourceFolders).toContain('docs');
  });

  test('major source folders list is capped at 12 entries', () => {
    for (let i = 0; i < 15; i++) create(`folder${i}/file.ts`, '');
    const snapshot = scanProject(tempDir);
    expect(snapshot.majorSourceFolders.length).toBeLessThanOrEqual(12);
  });
});

// ---------------------------------------------------------------------------
// filesFound
// ---------------------------------------------------------------------------

describe('scanProject — filesFound', () => {
  test('lists known config files found in the project', () => {
    create('package.json', '{}');
    create('tsconfig.json', '{}');
    create('vite.config.ts', 'export default {}');

    const snapshot = scanProject(tempDir);
    expect(snapshot.filesFound.some((f) => f.endsWith('package.json'))).toBe(true);
    expect(snapshot.filesFound.some((f) => f.endsWith('tsconfig.json'))).toBe(true);
    expect(snapshot.filesFound.some((f) => f.endsWith('vite.config.ts'))).toBe(true);
  });

  test('does not include arbitrary source files in filesFound', () => {
    create('src/someRandomComponent.tsx', '');

    const snapshot = scanProject(tempDir);
    // filesFound tracks known config files, not all source files
    expect(snapshot.filesFound.some((f) => f.includes('someRandomComponent'))).toBe(false);
  });

  test('filesFound are sorted', () => {
    create('package.json', '{}');
    create('tsconfig.json', '{}');

    const snapshot = scanProject(tempDir);
    const sorted = [...snapshot.filesFound].sort();
    expect(snapshot.filesFound).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// approxProjectSize
// ---------------------------------------------------------------------------

describe('scanProject — project size', () => {
  test('returns a size string with MB unit', () => {
    create('src/app.ts', 'x'.repeat(1024));
    const snapshot = scanProject(tempDir);
    expect(snapshot.approxProjectSize).toMatch(/\d+\.\d+ MB/);
  });

  test('returns 0.00 MB for empty project', () => {
    const snapshot = scanProject(tempDir);
    expect(snapshot.approxProjectSize).toBe('0.00 MB');
  });
});

// ---------------------------------------------------------------------------
// lastScanTime
// ---------------------------------------------------------------------------

describe('scanProject — lastScanTime', () => {
  test('returns a valid ISO timestamp', () => {
    const snapshot = scanProject(tempDir);
    const parsed = new Date(snapshot.lastScanTime);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(snapshot.lastScanTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('lastScanTime is close to current time', () => {
    const before = Date.now();
    const snapshot = scanProject(tempDir);
    const after = Date.now();
    const scanTime = new Date(snapshot.lastScanTime).getTime();
    expect(scanTime).toBeGreaterThanOrEqual(before);
    expect(scanTime).toBeLessThanOrEqual(after + 100);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('scanProject — edge cases', () => {
  test('returns empty/zero snapshot for non-existent path', () => {
    const snapshot = scanProject('/nonexistent/path/that/does/not/exist/anywhere');
    expect(snapshot.totalFileCount).toBe(0);
    expect(snapshot.frameworks).toEqual([]);
    expect(snapshot.filesFound).toEqual([]);
    expect(snapshot.buildSystems).toEqual([]);
    expect(snapshot.entryPoints).toEqual([]);
    expect(snapshot.majorSourceFolders).toEqual([]);
  });

  test('handles deeply nested project structure without crashing', () => {
    // Create a reasonably deep directory tree
    const deepPath = path.join('a', 'b', 'c', 'd', 'e', 'deep.ts');
    create(deepPath, 'export const deep = true;');

    expect(() => scanProject(tempDir)).not.toThrow();
    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBe(1);
  });

  test('handles project with only hidden/dot files gracefully', () => {
    create('.env', 'SECRET=abc');
    create('.gitignore', 'node_modules/');

    const snapshot = scanProject(tempDir);
    expect(snapshot.totalFileCount).toBeGreaterThanOrEqual(0);
  });
});
