import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { pathToFileURL } from 'url';
import * as path from 'path';

let trustedWindow: BrowserWindow | null = null;
let documentURL = '';

export function trustWindow(window: BrowserWindow, indexPath: string, development: boolean): void {
  trustedWindow = window;
  documentURL = development ? 'http://localhost:3002/' : pathToFileURL(path.resolve(indexPath)).href;
}

export function isTrustedDocument(value: string): boolean {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href === documentURL;
  } catch { return false; }
}

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!trustedWindow || trustedWindow.isDestroyed() ||
      event.sender !== trustedWindow.webContents ||
      !event.senderFrame || event.senderFrame !== event.sender.mainFrame ||
      !isTrustedDocument(event.senderFrame.url)) {
    throw new Error('This request did not come from the Libri application.');
  }
}

// All privileged handlers use this registrar, including handlers registered at module load.
export const secureIpcMain = {
  handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => any): void {
    ipcMain.handle(channel, (event, ...args) => {
      assertTrustedSender(event);
      const serialized = JSON.stringify(args);
      if (serialized.length > 16 * 1024 * 1024) throw new Error('Request is too large. Import a smaller file.');
      return listener(event, ...args);
    });
  }
};
