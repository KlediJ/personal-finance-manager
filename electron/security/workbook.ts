import * as yauzl from 'yauzl';

// Excel files are ZIP archives. Verify actual expanded bytes before ExcelJS allocates a workbook.
export function validateWorkbookArchive(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(data, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) { reject(error || new Error('Invalid workbook')); return; }
      let bytes = 0;
      let entries = 0;
      let finished = false;
      const fail = (reason: Error) => {
        if (finished) return;
        finished = true;
        zip.close();
        reject(reason);
      };
      zip.on('error', fail);
      zip.on('end', () => { if (!finished) { finished = true; resolve(); } });
      zip.on('entry', (entry: yauzl.Entry) => {
        if (++entries > 10000 || entry.uncompressedSize > 100 * 1024 * 1024 || entry.isEncrypted()) {
          fail(new Error('Workbook is too large or encrypted. Export a smaller unencrypted file.')); return;
        }
        if (/\/$/.test(entry.fileName)) { zip.readEntry(); return; }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { fail(streamError || new Error('Invalid workbook entry')); return; }
          stream.on('error', fail);
          stream.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 100 * 1024 * 1024) { stream.destroy(); fail(new Error('Expanded workbook exceeds 100 MB.')); }
          });
          stream.on('end', () => { if (!finished) zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}
