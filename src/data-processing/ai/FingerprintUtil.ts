import { PayeeExtractor } from './PayeeExtractor';

/**
 * Normalize a transaction description into a stable fingerprint for matching.
 * Prefer a cleaned merchant/payee-style name when one can be extracted, then
 * fall back to a normalized description fingerprint.
 */
export function fingerprintDescription(raw: string): string {
  if (!raw) return '';

  const extractedPayee = PayeeExtractor.extractPayeeFromDescription(raw);
  const normalizedPayee = normalizeSimilarityText(extractedPayee || '');

  if (normalizedPayee) {
    return normalizedPayee;
  }

  return normalizeSimilarityText(raw);
}

/**
 * Build several stable keys so near-identical merchant descriptions still match
 * even when extra bank noise or location fragments vary between rows.
 */
export function getDescriptionSimilarityKeys(raw: string): string[] {
  if (!raw) return [];

  const keys = new Set<string>();
  const normalizedDescription = normalizeSimilarityText(raw);
  const normalizedPayee = normalizeSimilarityText(
    PayeeExtractor.extractPayeeFromDescription(raw) || ''
  );

  const addTokenPrefixes = (value: string) => {
    const tokens = value.split(' ').filter(Boolean);
    if (tokens.length >= 2) {
      keys.add(tokens.slice(0, 2).join(' '));
    }
    if (tokens.length >= 3) {
      keys.add(tokens.slice(0, 3).join(' '));
    }
  };

  if (normalizedDescription) {
    keys.add(normalizedDescription);
    addTokenPrefixes(normalizedDescription);
  }

  if (normalizedPayee) {
    keys.add(normalizedPayee);
    addTokenPrefixes(normalizedPayee);
  }

  return Array.from(keys);
}

export function descriptionsLookSimilar(a: string, b: string): boolean {
  const aKeys = getDescriptionSimilarityKeys(a);
  const bKeys = new Set(getDescriptionSimilarityKeys(b));

  return aKeys.some((key) => bKeys.has(key));
}

function normalizeSimilarityText(raw: string): string {
  if (!raw) return '';

  let s = raw.toLowerCase();

  // Remove common date patterns and transaction IDs.
  s = s
    .replace(/\b\d{2}\/\d{2}\b/g, ' ')
    .replace(/\b\d{6}\b/g, ' ')
    .replace(/\b\d{8}\b/g, ' ')
    .replace(/card\s*\d+/g, ' ')
    .replace(/#\d{3,}/g, ' ')
    .replace(/\bs\d{6,}\b/g, ' ')
    .replace(/\b\d+\.\d{2}\b/g, ' ');

  // Normalize punctuation and separators.
  s = s
    .replace(/[/\\|_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ');

  const noiseTokens = new Set([
    'ach',
    'authorized',
    'card',
    'check',
    'credit',
    'debit',
    'deposit',
    'online',
    'payment',
    'pending',
    'purchase',
    'recurring',
    'store',
    'transfer',
    'transaction',
    'withdrawal'
  ]);

  const tokens = s
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !noiseTokens.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !/^[a-z]{2}\d{4,}$/.test(token))
    .filter((token) => token.length > 1);

  return tokens.join(' ').trim();
}
