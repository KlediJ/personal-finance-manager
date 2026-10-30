/** US-style amounts are explicit; ambiguous/invalid grouping is rejected, never truncated. */
export function parseImportAmount(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Amount must be finite');
    return value;
  }
  if (typeof value !== 'string') throw new Error('Amount must be a number');
  let text = value.trim();
  const negative = text.startsWith('(') && text.endsWith(')');
  if (negative) text = text.slice(1, -1).trim();
  text = text.replace(/^([+-]?)\s*[$£€]\s*/, '$1');
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text) || (negative && /^[+-]/.test(text))) {
    throw new Error('Use an amount such as 1,234.56 or (123.45)');
  }
  const amount = Number(text.replace(/,/g, '')) * (negative ? -1 : 1);
  if (!Number.isFinite(amount)) throw new Error('Amount must be finite');
  return amount;
}

/** Treat external text as spreadsheet text, not a formula. Real numeric amounts stay numeric. */
export function spreadsheetText(value: unknown): string {
  const text = String(value ?? '');
  return /^[\s\uFEFF]*[=+@\-＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
}

export function csvCell(value: unknown): string {
  const text = typeof value === 'number' ? String(value) : spreadsheetText(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
