import { Transaction } from '../../data-storage/models/Transaction';
import { Category } from '../../data-storage/models/Category';
import { Payee } from '../../data-storage/models/Payee';

export interface PayeeExtraction {
  payee: Payee;
  confidence: number;
  extracted: boolean; // true if newly extracted, false if matched existing
}

export interface CategoryPrediction {
  category: Category;
  confidence: number;
}

export interface MistralResult {
  categoryPredictions: CategoryPrediction[];
  payeeExtraction: PayeeExtraction | null;
  extractedInfo: {
    merchant?: string;
    location?: string;
    paymentMethod?: string;
    transactionType?: string;
    keywords?: string[];
  };
  confidence: number;
}

export class MistralProcessor {
  private readonly financialKeywords = new Map<string, string[]>([
    ['food', ['grocery', 'restaurant', 'cafe', 'dining', 'food', 'market', 'supermarket', 'deli', 'bakery', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast']],
    ['transportation', ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'toll', 'metro', 'bus', 'train', 'car', 'auto', 'vehicle', 'dmv']],
    ['utilities', ['electric', 'electricity', 'water', 'internet', 'phone', 'cable', 'utility', 'bill', 'energy', 'power', 'gas company']],
    ['healthcare', ['medical', 'doctor', 'hospital', 'pharmacy', 'dental', 'health', 'clinic', 'prescription', 'medicine', 'copay']],
    ['shopping', ['amazon', 'walmart', 'target', 'store', 'shopping', 'retail', 'clothing', 'electronics', 'home', 'online']],
    ['entertainment', ['netflix', 'spotify', 'movie', 'theater', 'concert', 'game', 'entertainment', 'subscription', 'streaming']],
    ['financial', ['bank', 'atm', 'fee', 'interest', 'loan', 'credit', 'transfer', 'payment', 'deposit', 'withdrawal']]
  ]);

  private readonly merchantPatterns = [
    // Enhanced merchant patterns for better extraction
    // Card transaction patterns - extract the actual merchant name
    /(?:purchase\s+authorized\s+on\s+\d{2}\/\d{2})\s+([^0-9]+?)(?:\s+[A-Z]{2})?(?:\s+[S]\d+)/i,
    
    // Common merchant patterns
    /([A-Z][A-Z'\s]+(?:MARKET S?|MARKETS?|STORE S?|SHOP S?|RESTAURANT S?|CAFE S?|BAR S?|GRILL S?|PIZZA S?|BURGER S?|DELI S?|BAKERY S?))/i,
    /([A-Z][A-Z'\s]+(?:GAS|FUEL|STATION|SERVICE))/i,
    /([A-Z][A-Z'\s]+(?:BANK|CREDIT|FINANCIAL|MORTGAGE|LOAN))/i,
    /([A-Z][A-Z'\s]+(?:HOSPITAL|CLINIC|MEDICAL|DENTAL|PHARMACY))/i,
    /([A-Z][A-Z'\s]+(?:HOTEL|RESORT|INN|MOTEL))/i,
    /([A-Z][A-Z'\s]+(?:AIRLINES?|AIRPORT|TRAVEL))/i,
    
    // Specific well-known merchants
    /(WALMART|TARGET|AMAZON|COSTCO|HOME\s+DEPOT|LOWES|BEST\s+BUY)/i,
    /(MCDONALDS?|BURGER\s*KING|SUBWAY|KFC|TACO\s*BELL|PIZZA\s*HUT|DOMINOS)/i,
    /(NETFLIX|SPOTIFY|APPLE|GOOGLE|MICROSOFT|ADOBE)/i,
    /^(walmart|target|costco|amazon|ebay|best\s*buy)/i,
    /^(shell|bp|chevron|exxon|mobil|citgo|sunoco)/i,
    /^(chase|bank\s*of\s*america|wells\s*fargo|citi|capital\s*one)/i,
    /^(netflix|spotify|hulu|disney|apple|google|microsoft)/i
  ];

  private readonly locationPatterns = [
    /\b\d{5}\b/, // ZIP codes
    /\b[A-Z]{2}\b/, // State abbreviations
    /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)\b/i,
    /\b(north|south|east|west|downtown|uptown|central|mall|plaza|center)\b/i
  ];

  constructor() {}

  private suggestCategoryForMerchant(merchantName: string, description: string): number | null {
    const lowerMerchant = merchantName.toLowerCase();
    const lowerDescription = description.toLowerCase();
    
    console.log(`🏷️ Suggesting category for merchant: "${merchantName}"`);
    
    // Food & Dining
    if (lowerMerchant.includes('restaurant') || lowerMerchant.includes('cafe') || 
        lowerMerchant.includes('pizza') || lowerMerchant.includes('burger') ||
        lowerMerchant.includes('deli') || lowerMerchant.includes('bakery') ||
        lowerDescription.includes('food') || lowerDescription.includes('dining')) {
      console.log(`🍕 Suggested category: Food & Dining (ID: 1)`);
      return 1;
    }
    
    // Transportation
    if (lowerMerchant.includes('gas') || lowerMerchant.includes('fuel') ||
        lowerMerchant.includes('station') || lowerMerchant.includes('uber') ||
        lowerMerchant.includes('lyft') || lowerMerchant.includes('taxi') ||
        lowerDescription.includes('transport') || lowerDescription.includes('parking')) {
      console.log(`🚗 Suggested category: Transportation (ID: 2)`);
      return 2;
    }
    
    // Utilities
    if (lowerMerchant.includes('electric') || lowerMerchant.includes('power') ||
        lowerMerchant.includes('water') || lowerMerchant.includes('internet') ||
        lowerMerchant.includes('phone') || lowerMerchant.includes('cable') ||
        lowerDescription.includes('utility') || lowerDescription.includes('bill')) {
      console.log(`⚡ Suggested category: Utilities (ID: 3)`);
      return 3;
    }
    
    // Shopping
    if (lowerMerchant.includes('store') || lowerMerchant.includes('shop') ||
        lowerMerchant.includes('market') || lowerMerchant.includes('walmart') ||
        lowerMerchant.includes('target') || lowerMerchant.includes('amazon') ||
        lowerDescription.includes('shopping') || lowerDescription.includes('retail')) {
      console.log(`🛒 Suggested category: Shopping (ID: 6)`);
      return 6;
    }
    
    // Healthcare
    if (lowerMerchant.includes('hospital') || lowerMerchant.includes('clinic') ||
        lowerMerchant.includes('medical') || lowerMerchant.includes('dental') ||
        lowerMerchant.includes('pharmacy') || lowerMerchant.includes('doctor') ||
        lowerDescription.includes('health') || lowerDescription.includes('prescription')) {
      console.log(`🏥 Suggested category: Healthcare (ID: 7)`);
      return 7;
    }
    
    // Entertainment
    if (lowerMerchant.includes('theater') || lowerMerchant.includes('cinema') ||
        lowerMerchant.includes('netflix') || lowerMerchant.includes('spotify') ||
        lowerMerchant.includes('game') || lowerMerchant.includes('entertainment') ||
        lowerDescription.includes('movie') || lowerDescription.includes('concert')) {
      console.log(`🎬 Suggested category: Entertainment (ID: 5)`);
      return 5;
    }
    
    console.log(`❓ No category suggestion for: "${merchantName}"`);
    return null;
  }

  public async processTransaction(
    transaction: Transaction,
    availableCategories: Category[],
    existingPayees: Payee[]
  ): Promise<MistralResult> {
    const description = transaction.description?.toLowerCase() || '';
    
    console.log(`🤖 MISTRAL PROCESSING Transaction ${transaction.transaction_id}:`);
    console.log(`📝 Description: "${transaction.description}"`);
    console.log(`💰 Amount: ${transaction.amount}`);
    console.log(`📊 Available Categories: ${availableCategories.length}`);
    console.log(`👥 Existing Payees: ${existingPayees.length}`);
    
    // Extract merchant/payee information
    const payeeExtraction = this.extractPayeeInfo(description, existingPayees);
    console.log(`🏪 Payee Extraction:`, payeeExtraction);
    
    // Predict category
    const categoryPredictions = this.predictCategory(description, availableCategories, payeeExtraction);
    console.log(`🏷️ Category Predictions:`, categoryPredictions);
    
    // Extract additional information
    const extractedInfo = this.extractAdditionalInfo(description);
    console.log(`ℹ️ Additional Info:`, extractedInfo);
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(categoryPredictions, payeeExtraction, extractedInfo);
    console.log(`📈 Overall Confidence: ${confidence}`);
    
    const result = {
      categoryPredictions,
      payeeExtraction,
      extractedInfo,
      confidence
    };
    
    console.log(`✅ MISTRAL RESULT:`, result);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    return result;
  }

  private extractPayeeInfo(description: string, existingPayees: Payee[]): PayeeExtraction | null {
    // First, try to match existing payees
    const matchedPayee = this.matchExistingPayee(description, existingPayees);
    if (matchedPayee) {
      return {
        payee: matchedPayee.payee,
        confidence: matchedPayee.confidence,
        extracted: false
      };
    }

    // Extract new payee from description
    const extractedPayee = this.extractNewPayee(description);
    if (extractedPayee) {
      return {
        payee: extractedPayee.payee,
        confidence: extractedPayee.confidence,
        extracted: true
      };
    }

    return null;
  }

  private matchExistingPayee(description: string, existingPayees: Payee[]): { payee: Payee; confidence: number } | null {
    let bestMatch: { payee: Payee; confidence: number } | null = null;
    let bestScore = 0;

    for (const payee of existingPayees) {
      const payeeName = payee.name.toLowerCase();
      const score = this.calculatePayeeMatchScore(description, payeeName);
      
      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = {
          payee,
          confidence: score
        };
      }
    }

    return bestMatch;
  }

  private calculatePayeeMatchScore(description: string, payeeName: string): number {
    const words = description.split(/\s+/);
    const payeeWords = payeeName.split(/\s+/);
    
    let matchedWords = 0;
    let totalWords = payeeWords.length;
    
    for (const payeeWord of payeeWords) {
      for (const word of words) {
        if (word.includes(payeeWord) || payeeWord.includes(word)) {
          matchedWords++;
          break;
        }
      }
    }
    
    return totalWords > 0 ? matchedWords / totalWords : 0;
  }

  private extractNewPayee(description: string): { payee: Payee; confidence: number } | null {
    console.log(`🔍 Extracting new payee from: "${description}"`);
    
    // Try merchant patterns
    for (const pattern of this.merchantPatterns) {
      const match = description.match(pattern);
      if (match) {
        const merchantName = this.cleanMerchantName(match[1]);
        console.log(`✅ Pattern match found: "${merchantName}"`);
        
        // Suggest a category based on merchant type
        const suggestedCategoryId = this.suggestCategoryForMerchant(merchantName, description);
        
        return {
          payee: {
            name: merchantName,
            default_category_id: suggestedCategoryId
          },
          confidence: 0.85
        };
      }
    }

    // Try to extract from the beginning of the description
    const words = description.split(/\s+/);
    if (words.length >= 2) {
      const potentialMerchant = words.slice(0, 2).join(' ');
      const cleanedMerchant = this.cleanMerchantName(potentialMerchant);
      
      if (cleanedMerchant.length > 3) {
        return {
          payee: {
            name: cleanedMerchant,
            default_category_id: null
          },
          confidence: 0.65
        };
      }
    }

    return null;
  }

  private cleanMerchantName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private predictCategory(
    description: string,
    availableCategories: Category[],
    payeeExtraction: PayeeExtraction | null
  ): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];
    
    // Use payee's default category if available
    if (payeeExtraction && payeeExtraction.payee.default_category_id) {
      const defaultCategory = availableCategories.find(c => c.category_id === payeeExtraction.payee.default_category_id);
      if (defaultCategory) {
        predictions.push({
          category: defaultCategory,
          confidence: 0.9
        });
      }
    }

    // Keyword-based categorization
    const keywordPredictions = this.getKeywordBasedPredictions(description, availableCategories);
    predictions.push(...keywordPredictions);

    // Pattern-based categorization
    const patternPredictions = this.getPatternBasedPredictions(description, availableCategories);
    predictions.push(...patternPredictions);

    // Remove duplicates and sort by confidence
    const uniquePredictions = new Map<number, CategoryPrediction>();
    
    for (const prediction of predictions) {
      const existing = uniquePredictions.get(prediction.category.category_id!);
      if (!existing || prediction.confidence > existing.confidence) {
        uniquePredictions.set(prediction.category.category_id!, prediction);
      }
    }

    return Array.from(uniquePredictions.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 predictions
  }

  private getKeywordBasedPredictions(description: string, availableCategories: Category[]): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];
    const scores: Map<string, { keywords: string[], score: number }> = new Map();
    
    console.log(`🔍 Keyword Analysis for: "${description}"`);
    
    // Preprocess description to avoid false matches
    const cleanDescription = description
      .replace(/\bcard\s+\d+/gi, '') // Remove "CARD 5493" type patterns
      .replace(/\b[s]\d+/gi, '') // Remove transaction IDs like "S385188860442334"
      .replace(/\d{2}\/\d{2}/g, '') // Remove dates
      .toLowerCase();
    
    console.log(`🧹 Cleaned description: "${cleanDescription}"`);
    
    for (const [categoryType, keywords] of this.financialKeywords) {
      const matchingKeywords = keywords.filter(keyword => {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(cleanDescription);
      });
      
      if (matchingKeywords.length > 0) {
        // Calculate weighted score based on keyword specificity
        let score = 0.7;
        for (const keyword of matchingKeywords) {
          // Longer, more specific keywords get higher scores
          const specificity = keyword.length / 10;
          score += 0.1 + specificity;
        }
        score = Math.min(0.95, score);
        
        scores.set(categoryType, { keywords: matchingKeywords, score });
        console.log(`✅ Found keywords for ${categoryType}: ${matchingKeywords.join(', ')} (score: ${score.toFixed(2)})`);
      }
    }
    
    // Convert scores to predictions with category matching
    for (const [categoryType, data] of scores) {
      const matchingCategory = availableCategories.find(c => 
        c.name.toLowerCase().includes(categoryType) || 
        c.name.toLowerCase().includes(data.keywords[0])
      );
      
      if (matchingCategory) {
        console.log(`🎯 Matched category: ${matchingCategory.name} (confidence: ${data.score})`);
        predictions.push({
          category: matchingCategory,
          confidence: data.score
        });
      } else {
        console.log(`❌ No matching category found for ${categoryType}`);
      }
    }
    
    if (predictions.length === 0) {
      console.log(`❌ No keyword matches found for: "${description}"`);
    }
    
    return predictions;
  }

  private getPatternBasedPredictions(description: string, availableCategories: Category[]): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];
    
    // Amount-based patterns
    const amountMatch = description.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      
      // Large amounts often indicate rent, loans, or major purchases
      if (amount >= 1000) {
        const housingCategory = availableCategories.find(c => 
          c.name.toLowerCase().includes('housing') || 
          c.name.toLowerCase().includes('rent')
        );
        if (housingCategory) {
          predictions.push({
            category: housingCategory,
            confidence: 0.7
          });
        }
      }
    }

    // Time-based patterns
    if (description.includes('monthly') || description.includes('recurring')) {
      const billsCategory = availableCategories.find(c => 
        c.name.toLowerCase().includes('bills') || 
        c.name.toLowerCase().includes('utilities')
      );
      if (billsCategory) {
        predictions.push({
          category: billsCategory,
          confidence: 0.8
        });
      }
    }

    return predictions;
  }

  private extractAdditionalInfo(description: string): {
    merchant?: string;
    location?: string;
    paymentMethod?: string;
    transactionType?: string;
    keywords?: string[];
  } {
    const info: any = {};
    
    // Extract location information
    for (const pattern of this.locationPatterns) {
      const match = description.match(pattern);
      if (match) {
        info.location = match[0];
        break;
      }
    }

    // Extract payment method
    if (description.includes('debit') || description.includes('check card')) {
      info.paymentMethod = 'Debit Card';
    } else if (description.includes('credit')) {
      info.paymentMethod = 'Credit Card';
    } else if (description.includes('check') || description.includes('ach')) {
      info.paymentMethod = 'Check/ACH';
    } else if (description.includes('cash') || description.includes('atm')) {
      info.paymentMethod = 'Cash/ATM';
    }

    // Extract transaction type
    if (description.includes('refund') || description.includes('return')) {
      info.transactionType = 'Refund';
    } else if (description.includes('fee') || description.includes('charge')) {
      info.transactionType = 'Fee';
    } else if (description.includes('transfer')) {
      info.transactionType = 'Transfer';
    } else if (description.includes('payment')) {
      info.transactionType = 'Payment';
    }

    // Extract relevant keywords
    const words = description.split(/\s+/);
    const relevantKeywords = words.filter(word => word.length > 3 && !this.isCommonWord(word));
    info.keywords = relevantKeywords.slice(0, 5);

    return info;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'are', 'not', 'can', 'will', 'but', 'all', 'any', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'doesnt', 'let', 'put', 'say', 'she', 'too', 'use'];
    return commonWords.includes(word.toLowerCase());
  }

  private calculateOverallConfidence(
    categoryPredictions: CategoryPrediction[],
    payeeExtraction: PayeeExtraction | null,
    extractedInfo: any
  ): number {
    let totalConfidence = 0;
    let components = 0;

    // Category confidence
    if (categoryPredictions.length > 0) {
      totalConfidence += categoryPredictions[0].confidence;
      components++;
    }

    // Payee confidence
    if (payeeExtraction) {
      totalConfidence += payeeExtraction.confidence;
      components++;
    }

    // Information extraction confidence
    const infoCount = Object.keys(extractedInfo).length;
    if (infoCount > 0) {
      totalConfidence += Math.min(0.8, infoCount * 0.2);
      components++;
    }

    return components > 0 ? totalConfidence / components : 0;
  }

  public async batchProcessTransactions(
    transactions: Transaction[],
    availableCategories: Category[],
    existingPayees: Payee[],
    onProgress?: (progress: number) => void
  ): Promise<Map<number, MistralResult>> {
    const results = new Map<number, MistralResult>();
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const result = await this.processTransaction(transaction, availableCategories, existingPayees);
      
      if (transaction.transaction_id) {
        results.set(transaction.transaction_id, result);
      }
      
      if (onProgress) {
        onProgress((i + 1) / transactions.length * 100);
      }
    }
    
    return results;
  }
}