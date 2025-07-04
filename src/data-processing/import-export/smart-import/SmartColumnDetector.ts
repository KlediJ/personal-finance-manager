/**
 * SmartColumnDetector.ts
 * 
 * A service that uses pattern matching and data analysis to intelligently
 * detect and map columns in imported financial data
 */

export interface ColumnMapping {
  field: string;        // Target field in our database schema
  columnName: string;   // Source column name from the imported file
  confidence: number;   // Confidence score (0-1) for this mapping
  samples?: string[];   // Sample values for validation
}

export class SmartColumnDetector {
  // Common column name patterns for each field
  private static readonly COLUMN_PATTERNS: Record<string, string[]> = {
    date: [
      'date', 'transaction date', 'post date', 'posted', 'transaction time',
      'time', 'day', 'posting date', 'entry date', 'date posted', 'dt', 'fecha'
    ],
    
    description: [
      'description', 'desc', 'memo', 'notes', 'narrative', 'details', 'transaction',
      'particulars', 'remarks', 'reference', 'note', 'payee', 'transaction details',
      'payment details', 'item', 'transaction description', 'activity', 'name'
    ],
    
    amount: [
      'amount', 'sum', 'total', 'value', 'price', 'payment', 'transaction amount',
      'debit amount', 'credit amount', 'paid', 'quantity', 'amt', 'money', 'paid in',
      'paid out', 'deposit', 'withdrawal', 'spent', 'received'
    ],

    transaction_type: [
      'type', 'transaction type', 'tran type', 'trn type', 'entry type', 
      'transaction kind', 'kind', 'dr/cr', 'debit/credit', 'direction'
    ],
    
    category: [
      'category', 'cat', 'categories', 'classification', 'group', 'tag',
      'expense category', 'income category', 'transaction category'
    ],
    
    account: [
      'account', 'acc', 'account name', 'account number', 'account #', 'acct',
      'bank account', 'card', 'from account', 'to account', 'source'
    ],
    
    status: [
      'status', 'state', 'cleared', 'reconciled', 'pending', 'processed',
      'transaction status', 'verification', 'verified'
    ],
  };

  // Data type detection patterns
  private static readonly DATE_PATTERNS: RegExp[] = [
    /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/, // MM/DD/YYYY, DD/MM/YYYY
    /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/,   // YYYY-MM-DD
    /^\d{1,2}[-/\.][A-Za-z]{3}[-/\.]\d{2,4}$/, // DD-MMM-YYYY
    /^\d{1,2} [A-Za-z]{3} \d{4}$/,         // DD MMM YYYY
    /^[A-Za-z]{3} \d{1,2}, \d{4}$/,        // MMM DD, YYYY
    /^\d{8}$/                               // YYYYMMDD
  ];

  private static readonly AMOUNT_PATTERNS: RegExp[] = [
    /^[-+]?\$?\s?\d+,?\d*\.?\d*$/, // $123.45, $1,234.56, +123.45, -123.45
    /^[-+]?\€?\s?\d+,?\d*\.?\d*$/, // €123.45, €1,234.56
    /^[-+]?\£?\s?\d+,?\d*\.?\d*$/, // £123.45, £1,234.56
    /^[-+]?\¥?\s?\d+,?\d*\.?\d*$/, // ¥123.45, ¥1,234.56
    /^[-+]?\s?\d+,?\d*\.?\d*\s?\$?$/, // 123.45$, 1,234.56$
    /^debit:?\s?[-+]?\$?\s?\d+,?\d*\.?\d*$/i, // Debit: $123.45
    /^credit:?\s?[-+]?\$?\s?\d+,?\d*\.?\d*$/i // Credit: $123.45
  ];

  /**
   * Detect column mappings from headers and data
   * 
   * @param headers Array of column headers from the imported file
   * @param sampleData Sample rows of data for content analysis
   * @returns Suggested column mappings with confidence scores
   */
  public static detectColumnMappings(
    headers: string[],
    sampleData: any[]
  ): Record<string, ColumnMapping> {
    // Initialize results with empty mappings
    const mappings: Record<string, ColumnMapping> = {};
    
    // Track already mapped columns to avoid duplicates
    const mappedColumns = new Set<string>();
    
    // Step 1: Match by header names
    this.matchHeadersByName(headers, mappings, mappedColumns);
    
    // Step 2: If we're missing critical columns, try to infer from data content
    if (!mappings.date || !mappings.amount) {
      this.inferColumnsFromContent(headers, sampleData, mappings, mappedColumns);
    }
    
    // Step 3: Try to separate amount columns if we have debits and credits separate
    this.handleDebitCreditColumns(headers, sampleData, mappings, mappedColumns);
    
    // Step 4: Add sample values to validate mappings
    this.addSampleValues(sampleData, mappings);
    
    return mappings;
  }
  
  /**
   * Match columns based on header names
   */
  private static matchHeadersByName(
    headers: string[],
    mappings: Record<string, ColumnMapping>,
    mappedColumns: Set<string>
  ): void {
    // For each target field (date, amount, etc.)
    for (const [field, patterns] of Object.entries(this.COLUMN_PATTERNS)) {
      // For each header name in the file
      for (const header of headers) {
        // Skip already mapped columns
        if (mappedColumns.has(header)) continue;
        
        const lowerHeader = header.toLowerCase().trim();
        
        // Exact match (highest confidence)
        if (patterns.includes(lowerHeader)) {
          mappings[field] = {
            field,
            columnName: header,
            confidence: 1.0,
          };
          mappedColumns.add(header);
          break;
        }
        
        // Partial match (substring)
        for (const pattern of patterns) {
          if (lowerHeader.includes(pattern)) {
            // Confidence based on how much of the header matches the pattern
            const confidence = pattern.length / lowerHeader.length;
            
            // Only set if we don't have a mapping yet, or if this one has higher confidence
            if (!mappings[field] || confidence > mappings[field].confidence) {
              mappings[field] = {
                field,
                columnName: header,
                confidence: Math.min(confidence * 1.5, 0.9), // Scale up but cap at 0.9
              };
              mappedColumns.add(header);
            }
            break;
          }
        }
      }
    }
  }
  
  /**
   * Infer column types from data content patterns
   */
  private static inferColumnsFromContent(
    headers: string[],
    sampleData: any[],
    mappings: Record<string, ColumnMapping>,
    mappedColumns: Set<string>
  ): void {
    // Nothing to analyze
    if (!sampleData || sampleData.length === 0) return;
    
    // For each column
    for (const header of headers) {
      // Skip already mapped columns
      if (mappedColumns.has(header)) continue;
      
      let dateMatches = 0;
      let amountMatches = 0;
      let totalValues = 0;
      
      // Check sample values in this column
      for (const row of sampleData.slice(0, Math.min(10, sampleData.length))) {
        const value = row[header];
        if (value === undefined || value === null || value === '') continue;
        
        totalValues++;
        const stringValue = String(value).trim();
        
        // Check for date patterns
        if (this.isLikelyDate(stringValue)) {
          dateMatches++;
        }
        
        // Check for amount patterns
        if (this.isLikelyAmount(stringValue)) {
          amountMatches++;
        }
      }
      
      // Calculate match percentages
      const datePercent = totalValues > 0 ? dateMatches / totalValues : 0;
      const amountPercent = totalValues > 0 ? amountMatches / totalValues : 0;
      
      // If most values match a date pattern and we don't have a date mapping
      if (datePercent > 0.7 && (!mappings.date || mappings.date.confidence < datePercent)) {
        mappings.date = {
          field: 'date',
          columnName: header,
          confidence: Math.min(datePercent, 0.85),  // Cap confidence
        };
        mappedColumns.add(header);
      }
      
      // If most values match an amount pattern and we don't have an amount mapping
      if (amountPercent > 0.7 && (!mappings.amount || mappings.amount.confidence < amountPercent)) {
        mappings.amount = {
          field: 'amount',
          columnName: header,
          confidence: Math.min(amountPercent, 0.85),  // Cap confidence
        };
        mappedColumns.add(header);
      }
    }
  }
  
  /**
   * Handle separate debit and credit columns
   */
  private static handleDebitCreditColumns(
    headers: string[],
    sampleData: any[],
    mappings: Record<string, ColumnMapping>,
    mappedColumns: Set<string>
  ): void {
    // Already have an amount mapping with high confidence
    if (mappings.amount && mappings.amount.confidence > 0.8) return;
    
    // Look for debit/credit column pairs
    const debitColumn = headers.find(h => 
      !mappedColumns.has(h) && 
      h.toLowerCase().includes('debit') || 
      h.toLowerCase().includes('payment') ||
      h.toLowerCase().includes('withdrawal') ||
      h.toLowerCase().includes('expense')
    );
    
    const creditColumn = headers.find(h => 
      !mappedColumns.has(h) && 
      h.toLowerCase().includes('credit') ||
      h.toLowerCase().includes('deposit') ||
      h.toLowerCase().includes('income')
    );
    
    // If we found both debit and credit columns
    if (debitColumn && creditColumn) {
      // Store this information for processing later
      mappings.debit_amount = {
        field: 'debit_amount',
        columnName: debitColumn,
        confidence: 0.85,
      };
      
      mappings.credit_amount = {
        field: 'credit_amount',
        columnName: creditColumn,
        confidence: 0.85,
      };
      
      mappedColumns.add(debitColumn);
      mappedColumns.add(creditColumn);
    }
  }
  
  /**
   * Add sample values to help validate mappings
   */
  private static addSampleValues(
    sampleData: any[],
    mappings: Record<string, ColumnMapping>
  ): void {
    if (!sampleData || sampleData.length === 0) return;
    
    // For each mapping
    for (const field in mappings) {
      const mapping = mappings[field];
      const samples: string[] = [];
      
      // Get sample values (up to 3)
      for (const row of sampleData.slice(0, Math.min(10, sampleData.length))) {
        const value = row[mapping.columnName];
        if (value !== undefined && value !== null && value !== '' && samples.length < 3) {
          samples.push(String(value));
        }
      }
      
      mapping.samples = samples;
    }
  }
  
  /**
   * Check if a string is likely to be a date
   */
  private static isLikelyDate(value: string): boolean {
    // Check against date regex patterns
    for (const pattern of this.DATE_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    
    // Try parsing with Date
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
  
  /**
   * Check if a string is likely to be an amount
   */
  private static isLikelyAmount(value: string): boolean {
    // Remove currency formatting
    const cleanValue = value.replace(/[^\d\.,\-+]/g, '');
    
    // Check if it can be parsed as a number
    if (!isNaN(Number(cleanValue.replace(',', '.')))) return true;
    
    // Check against amount regex patterns
    for (const pattern of this.AMOUNT_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    
    return false;
  }
  
  /**
   * Generate final mappings with the best confidence
   * 
   * @param detectedMappings The raw detected mappings
   * @returns Clean mappings in the format expected by the import wizard
   */
  public static generateMappings(
    detectedMappings: Record<string, ColumnMapping>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Handle regular fields
    for (const [field, mapping] of Object.entries(detectedMappings)) {
      // Skip special fields we'll handle separately
      if (field === 'debit_amount' || field === 'credit_amount') continue;
      
      // Only include mappings with reasonable confidence
      if (mapping.confidence >= 0.6) {
        result[field] = mapping.columnName;
      }
    }
    
    // Handle debit/credit columns if present
    if (detectedMappings.debit_amount && detectedMappings.credit_amount) {
      // Mark that we're using split amounts
      result._useSplitAmounts = 'true';
      result.debit_amount = detectedMappings.debit_amount.columnName;
      result.credit_amount = detectedMappings.credit_amount.columnName;
    }
    
    return result;
  }
}
