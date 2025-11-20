import { Payee } from '../../data-storage/models/Payee';

/**
 * Service to extract and normalize payee names from transaction descriptions
 */
export class PayeeExtractor {
  
  /**
   * Extract payee name from transaction description using pattern matching
   * This provides a fallback when AI services aren't available
   */
  public static extractPayeeFromDescription(description: string): string | null {
    if (!description || description.trim().length === 0) {
      return null;
    }

    const desc = description.trim().toUpperCase();
    
    // Common bank transaction patterns
    const patterns = [
      // "PURCHASE AUTHORIZED ON MM/DD MERCHANT NAME"
      /PURCHASE\s+AUTHORIZED\s+ON\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "DEBIT CARD PURCHASE MM/DD MERCHANT NAME"
      /DEBIT\s+CARD\s+PURCHASE\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "ATM WITHDRAWAL MM/DD LOCATION"
      /ATM\s+WITHDRAWAL\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "CHECK #123 TO PAYEE NAME"
      /CHECK\s+#?\d+\s+TO\s+(.+?)$/,
      
      // "AUTOMATIC PAYMENT TO PAYEE NAME"
      /AUTOMATIC\s+PAYMENT\s+TO\s+(.+?)$/,
      
      // "ONLINE PAYMENT TO PAYEE NAME"
      /ONLINE\s+PAYMENT\s+TO\s+(.+?)$/,
      
      // "TRANSFER TO PAYEE NAME"
      /TRANSFER\s+TO\s+(.+?)$/,
      
      // "TRANSFER FROM PAYEE NAME"
      /TRANSFER\s+FROM\s+(.+?)$/,
      
      // "DIRECT DEPOSIT FROM PAYEE NAME"
      /DIRECT\s+DEPOSIT\s+FROM\s+(.+?)$/,
      
      // "WITHDRAWAL AT MERCHANT NAME"
      /WITHDRAWAL\s+AT\s+(.+?)$/,
      
      // "PAYMENT TO PAYEE NAME"
      /PAYMENT\s+TO\s+(.+?)$/,
      
      // Generic "MERCHANT NAME LOCATION" pattern
      /^([A-Z0-9\\s&'-]+?)(?:\s+[A-Z]{2}\s+\d{5})?(?:\s+CARD\s+\d+)?$/,
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        return this.cleanPayeeName(match[1]);
      }
    }

    // If no pattern matches, try to clean the whole description
    const cleaned = this.cleanPayeeName(desc);
    
    // Only return if it looks like a reasonable payee name (not just numbers or too short)
    if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  }

  /**
   * Clean and normalize payee name
   */
  private static cleanPayeeName(rawName: string): string {
    let cleaned = rawName.trim();
    
    // Remove common bank codes and suffixes
    const removePatterns = [
      /^\d{6}\s+/,                // Leading posting date codes like "250919"
      /\s+CARD\s+\d+.*$/i,
      /\s+\d{4,}.*$/,  // Remove long numbers at end
      /\s+S\d{6,}.*$/i, // Remove trailing S-codes like "S305242718808044"
      /\s+[A-Z]{2}\s+\d{5}.*$/,  // Remove state/zip
      /\s+PURCHASE.*$/i,
      /\s+PAYMENT.*$/i,
      /\s+DEPOSIT.*$/i,
      /\s+WITHDRAWAL.*$/i,
      /\s+TRANSFER.*$/i,
      /\s+AUTHORIZED.*$/i,
      /\s+TRANSACTION.*$/i,
      /\s+#\d+.*$/,  // Remove reference numbers
    ];

    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/[*#]+/g, '')  // Remove asterisks and hashes
      .replace(/^\W+|\W+$/g, '')  // Remove leading/trailing non-word chars
      .trim();
    
    // Convert to title case for better readability
    cleaned = this.toTitleCase(cleaned);
    
    return cleaned;
  }

  /**
   * Convert string to title case
   */
  private static toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Suggest category based on payee name
   */
  public static suggestCategory(payeeName: string): string | null {
    const name = payeeName.toLowerCase();
    
    // Grocery stores
    if (name.includes('market') || name.includes('grocery') || name.includes('food') || 
        name.includes('walmart') || name.includes('target') || name.includes('kroger') ||
        name.includes('safeway') || name.includes('publix') || name.includes('whole foods')) {
      return 'Groceries';
    }
    
    // Gas stations
    if (name.includes('shell') || name.includes('exxon') || name.includes('bp') || 
        name.includes('chevron') || name.includes('mobil') || name.includes('gas') ||
        name.includes('fuel') || name.includes('station')) {
      return 'Transportation';
    }
    
    // Restaurants
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('coffee') || 
        name.includes('starbucks') || name.includes('mcdonald') || name.includes('burger') ||
        name.includes('pizza') || name.includes('diner') || name.includes('bistro')) {
      return 'Food & Dining';
    }
    
    // Utilities
    if (name.includes('electric') || name.includes('gas') || name.includes('water') || 
        name.includes('utility') || name.includes('power') || name.includes('energy')) {
      return 'Utilities';
    }
    
    // Healthcare
    if (name.includes('medical') || name.includes('doctor') || name.includes('hospital') || 
        name.includes('pharmacy') || name.includes('dental') || name.includes('health')) {
      return 'Healthcare';
    }
    
    // Default to null for manual categorization
    return null;
  }

  /**
   * Create a payee object from extracted information
   */
  public static createPayeeFromDescription(description: string, defaultCategoryId?: number): Partial<Payee> | null {
    const payeeName = this.extractPayeeFromDescription(description);
    
    if (!payeeName) {
      return null;
    }
    
    return {
      name: payeeName,
      default_category_id: defaultCategoryId || null
    };
  }
}
