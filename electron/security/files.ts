import * as fs from 'fs';
import * as path from 'path';
import { IpcMainInvokeEvent } from 'electron';

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 50000;
const grants = new Map<number, { read?: string; write?: string }>();

export function clearFileGrants(senderId: number): void { grants.delete(senderId); }

export function revokeExport(senderId: number): void {
  const current = grants.get(senderId);
  if (current) delete current.write;
}

export function grantFile(event: IpcMainInvokeEvent, selected: string, mode: 'read' | 'write', extensions: string[]): string {
  const resolved = path.resolve(selected);
  if (!extensions.includes(path.extname(resolved).toLowerCase())) throw new Error('Choose a file with the selected format extension.');
  const current = grants.get(event.sender.id) || {};
  current[mode] = resolved;
  grants.set(event.sender.id, current);
  return resolved;
}

export function authorizedFile(event: IpcMainInvokeEvent, selected: string, mode: 'read' | 'write', extension: string): string {
  if (typeof selected !== 'string' || !path.isAbsolute(selected)) throw new Error('Choose a file using the file dialog first.');
  const resolved = path.resolve(selected);
  const current = grants.get(event.sender.id);
  if (!current || current[mode] !== resolved || path.extname(resolved).toLowerCase() !== extension) {
    throw new Error('Choose this file using the file dialog first.');
  }
  if (mode === 'write') delete current.write; // One write per save-dialog approval.
  return resolved;
}

export function readImportFile(event: IpcMainInvokeEvent, selected: string, extension: string): Buffer {
  const approved = authorizedFile(event, selected, 'read', extension);
  const fd = fs.openSync(approved, 'r');
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_IMPORT_BYTES) throw new Error('Import files must be regular files no larger than 25 MB.');
    // Bounded read, even if another process grows the selected file while it is open.
    const buffer = Buffer.alloc(Math.min(stat.size + 1, MAX_IMPORT_BYTES + 1));
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > stat.size || length > MAX_IMPORT_BYTES) throw new Error('The selected file changed. Select it again.');
    return buffer.subarray(0, length);
  } finally { fs.closeSync(fd); }
}
