/**
 * Extracted from src/main/main.ts — runCommand with an injectable line callback
 * so tests can capture output without Electron IPC.
 */

import { spawn } from 'node:child_process';
import type { CommandRequest } from '../renderer/types';
import { validateCommandRequest } from './commandSafety';

export type CommandResult = { success: boolean; output: string; code: number | null };

export type LineCallback = (label: string, level: 'info' | 'warning') => void;

export const runCommand = (request: CommandRequest, onLine?: LineCallback): Promise<CommandResult> =>
  new Promise((resolve) => {
    const safety = validateCommandRequest(request);
    if (!safety.ok) {
      resolve({ success: false, output: `Command blocked: ${safety.reason || 'unsafe command request'}`, code: -1 });
      return;
    }

    const child = spawn(request.command, request.args, { cwd: request.cwd, shell: true });
    let output = '';

    child.stdout.on('data', (d) => {
      const text = d.toString();
      output += text;
      if (onLine) {
        text.trim().split('\n').forEach((line: string) => {
          if (line.trim()) onLine(line.trim(), 'info');
        });
      }
    });

    child.stderr.on('data', (d) => {
      const text = d.toString();
      output += text;
      if (onLine) {
        text.trim().split('\n').forEach((line: string) => {
          if (line.trim()) onLine(line.trim(), 'warning');
        });
      }
    });

    child.on('close', (code) => resolve({ success: code === 0, output, code }));
    child.on('error', (err) => resolve({ success: false, output: String(err), code: -1 }));
  });
