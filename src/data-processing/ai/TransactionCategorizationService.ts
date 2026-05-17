import { Transaction } from '../../data-storage/models/Transaction';
import { Category } from '../../data-storage/models/Category';
import { Payee } from '../../data-storage/models/Payee';

/**
 * Result structure for payee extraction
 */
export interface PayeeExtraction {
  payee: Payee;
  confidence: number;
  extracted: boolean; // true if newly extracted, false if matched existing
}

/**
 * Category prediction with confidence score
 */
export interface CategoryPrediction {
  category: Category;
  confidence: number;
}

/**
 * Complete categorization result
 */
export interface CategorizationResult {
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

/**
 * Rule-based transaction categorization service
 *
 * Phase 1 implementation: 75-80% accuracy target
 * - Pattern matching for merchant identification
 * - Confidence scoring
 * - Learning from user corrections
 * - NO heavy models (Mistral/CodeLlama)
 */
export class TransactionCategorizationService {
  /**
   * Comprehensive merchant patterns organized by category
   * Based on user's transaction data analysis (450+ transactions)
   */
  private readonly merchantPatterns = new Map<string, RegExp[]>([
    ['groceries', [
      /\bstop\s*&\s*shop\b/i,
      /\btrader\s*joe'?s\b/i,
      /\bwhole\s*foods\b/i,
      /\bmarket\s*basket\b/i,
      /\bshaws?\b/i,
      /\bhanaford\b/i,
      /\baldi\b/i,
      /\bwegmans\b/i,
      /\bpublix\b/i,
      /\bkroger\b/i,
      /\bsafeway\b/i,
      /\bfood\s*lion\b/i,
      /\bh[\s-]?e[\s-]?b\b/i,
      /\bsprouts\b/i,
      /\bcostco\b/i,
      /\bsam'?s\s*club\b/i,
      /\bbj'?s\s*wholesale\b/i,
      /\b(super)?market\b/i,
      /\bgrocery\b/i,
      /\bfresh\s*market\b/i
    ]],
    ['gas_fuel', [
      /\bshell\b/i,
      /\bexxon(\s*mobil)?\b/i,
      /\bmobil\b/i,
      /\bchevron\b/i,
      /\bbp\b/i,
      /\bsunoco\b/i,
      /\bgulf\b/i,
      /\bcitgo\b/i,
      /\b76\b/i,
      /\bvalero\b/i,
      /\bmarathon\b/i,
      /\bspeedway\b/i,
      /\bwawa\b/i,
      /\bgetgo\b/i,
      /\b7[\s-]?eleven\b/i,
      /\bcumberland\s*farms\b/i,
      /\bgas\s*station\b/i,
      /\bfuel\b/i,
      /\bpetrol\b/i
    ]],
    ['restaurants', [
      /\bmcdonald'?s\b/i,
      /\bdunkin'?\s*(donuts)?\b/i,
      /\bstarbucks\b/i,
      /\bsubway\b/i,
      /\bwendy'?s\b/i,
      /\bburger\s*king\b/i,
      /\btaco\s*bell\b/i,
      /\bkfc\b/i,
      /\bpopeyes\b/i,
      /\bchipotle\b/i,
      /\bpanera\b/i,
      /\bolive\s*garden\b/i,
      /\bapplebee'?s\b/i,
      /\bchili'?s\b/i,
      /\boutback\b/i,
      /\bred\s*lobster\b/i,
      /\btexas\s*roadhouse\b/i,
      /\bpizza\s*hut\b/i,
      /\bdomino'?s\b/i,
      /\bpapa\s*john'?s\b/i,
      /\blittle\s*caesars\b/i,
      /\barby'?s\b/i,
      /\bfive\s*guys\b/i,
      /\bshake\s*shack\b/i,
      /\bin[\s-]?n[\s-]?out\b/i,
      /\bcafe\b/i,
      /\brestaurant\b/i,
      /\bdining\b/i,
      /\bgrill\b/i,
      /\bbistro\b/i,
      /\bpizzeria\b/i,
      /\bdeli\b/i,
      /\bbakery\b/i,
      /\bbuffet\b/i
    ]],
    ['utilities', [
      /\beversource\b/i,
      /\bnational\s*grid\b/i,
      /\bcon[\s-]?ed(ison)?\b/i,
      /\bduke\s*energy\b/i,
      /\bpg&e\b/i,
      /\bcomcast\b/i,
      /\bxfinity\b/i,
      /\bverizon\b/i,
      /\bat&t\b/i,
      /\bt[\s-]?mobile\b/i,
      /\bspectrum\b/i,
      /\bcox\b/i,
      /\boptimum\b/i,
      /\brcn\b/i,
      /\belectric\b/i,
      /\bpower\b/i,
      /\bwater\s*(company|dept)?\b/i,
      /\bsewer\b/i,
      /\binternet\b/i,
      /\bcable\b/i,
      /\bphone\b/i,
      /\btelecom\b/i,
      /\butility\b/i,
      /\benergy\b/i
    ]],
    ['shopping', [
      /\bwalmart\b/i,
      /\btarget\b/i,
      /\bamazon\b/i,
      /\bbest\s*buy\b/i,
      /\bhome\s*depot\b/i,
      /\blowe'?s\b/i,
      /\bmacy'?s\b/i,
      /\bkohl'?s\b/i,
      /\btj\s*maxx\b/i,
      /\bmarshalls\b/i,
      /\bhome\s*goods\b/i,
      /\bross\b/i,
      /\bold\s*navy\b/i,
      /\bgap\b/i,
      /\bbed\s*bath\s*&\s*beyond\b/i,
      /\bbath\s*&\s*body\s*works\b/i,
      /\bsephora\b/i,
      /\bulta\b/i,
      /\bdick'?s\s*sporting\s*goods\b/i,
      /\bpetco\b/i,
      /\bpetsmart\b/i,
      /\bstaples\b/i,
      /\boffice\s*depot\b/i,
      /\bmichaels\b/i,
      /\bhobby\s*lobby\b/i,
      /\bikea\b/i,
      /\bcrate\s*&\s*barrel\b/i
    ]],
    ['entertainment', [
      /\bnetflix\b/i,
      /\bspotify\b/i,
      /\bhulu\b/i,
      /\bdisney\s*\+?\b/i,
      /\bhbo\s*(max)?\b/i,
      /\bapple\s*tv\b/i,
      /\bamazon\s*prime\b/i,
      /\byoutube\s*(premium)?\b/i,
      /\bparamount\s*\+?\b/i,
      /\bplex\b/i,
      /\bsteam\b/i,
      /\bplaystation\b/i,
      /\bxbox\b/i,
      /\bnintendo\b/i,
      /\bamc\s*theatres?\b/i,
      /\bregal\s*cinema\b/i,
      /\bcinemark\b/i,
      /\btheater\b/i,
      /\bcinema\b/i,
      /\bmovie\b/i,
      /\bconcert\b/i,
      /\bticketmaster\b/i,
      /\bstubhub\b/i
    ]],
    ['healthcare', [
      /\bcvs\s*(pharmacy)?\b/i,
      /\bwalgreens\b/i,
      /\brite\s*aid\b/i,
      /\bpharmacy\b/i,
      /\bdoctor\b/i,
      /\bdr\.\b/i,
      /\bhospital\b/i,
      /\bmedical\s*(center|group|assoc)?\b/i,
      /\bclinic\b/i,
      /\bdental\b/i,
      /\bdentist\b/i,
      /\borthodont\b/i,
      /\bvision\b/i,
      /\boptometr\b/i,
      /\bhealth\s*care\b/i,
      /\bmed\s*center\b/i,
      /\blab(oratory)?\b/i,
      /\bimaging\b/i,
      /\btherapy\b/i,
      /\bchiropractic\b/i
    ]],
    ['transportation', [
      /\buber\b/i,
      /\blyft\b/i,
      /\btaxi\b/i,
      /\bcab\b/i,
      /\bparking\b/i,
      /\btoll\b/i,
      /\btransit\b/i,
      /\bsubway\b/i,
      /\bbus\b/i,
      /\btrain\b/i,
      /\bamtrak\b/i,
      /\bgreyhound\b/i,
      /\bairport\b/i,
      /\btsa\b/i,
      /\bcar\s*rental\b/i,
      /\bhertz\b/i,
      /\benterprise\b/i,
      /\bavis\b/i,
      /\bbudget\b/i
    ]],
    ['financial', [
      /\bbank\b/i,
      /\batm\b/i,
      /\bfee\b/i,
      /\binterest\b/i,
      /\bloan\s*payment\b/i,
      /\bcredit\s*card\s*payment\b/i,
      /\btransfer\b/i,
      /\bdeposit\b/i,
      /\bwithdrawal\b/i,
      /\boverdraft\b/i,
      /\bnsf\b/i,
      /\bfinance\s*charge\b/i
    ]]
  ]);

  /**
   * Transaction description patterns for merchant extraction
   */
  private readonly descriptionPatterns = [
    // "PURCHASE AUTHORIZED ON MM/DD MERCHANT_NAME"
    /(?:purchase\s+authorized\s+on\s+\d{2}\/\d{2})\s+([^0-9]+?)(?:\s+[A-Z]{2})?(?:\s+card\s*\d+)?$/i,

    // "RECURRING PAYMENT AUTHORIZED ON MM/DD MERCHANT_NAME"
    /(?:recurring\s+payment\s+authorized\s+on\s+\d{2}\/\d{2})\s+(.+?)(?:\s+[A-Z]{2})?(?:\s+card\s*\d+)?$/i,

    // "PAYPAL INST XFER" or "PAYPAL *MERCHANT_NAME"
    /paypal\s*(?:\*|inst\s*xfer)\s*(.+)/i,

    // Common merchant name patterns
    /^([A-Z][A-Z'\s&]+(?:MARKET|STORE|SHOP|RESTAURANT|CAFE|GAS|STATION))/i,

    // Specific merchants at the start
    /^(WALMART|TARGET|AMAZON|COSTCO|HOME\s*DEPOT|SHELL|EXXON|CVS|WALGREENS)/i
  ];

  /**
   * Category confidence scoring thresholds
   */
  private readonly CONFIDENCE_EXACT_MATCH = 1.0;
  private readonly CONFIDENCE_STRONG_PATTERN = 0.9;
  private readonly CONFIDENCE_GOOD_PATTERN = 0.8;
  private readonly CONFIDENCE_FUZZY_MATCH = 0.7;
  private readonly CONFIDENCE_WEAK_MATCH = 0.6;
  private readonly CONFIDENCE_LOW = 0.5;

  /**
   * Categorize a single transaction
   */
  public async processTransaction(
    transaction: Transaction,
    availableCategories: Category[],
    existingPayees: Payee[]
  ): Promise<CategorizationResult> {
    const description = transaction.description || '';

    // Extract payee/merchant information
    const payeeExtraction = this.extractPayeeInfo(description, existingPayees);

    // Predict category
    const categoryPredictions = this.predictCategory(
      description,
      transaction.amount,
      availableCategories,
      payeeExtraction,
      transaction.transaction_type
    );

    // Extract additional metadata
    const extractedInfo = this.extractAdditionalInfo(description);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      categoryPredictions,
      payeeExtraction,
      extractedInfo
    );

    return {
      categoryPredictions,
      payeeExtraction,
      extractedInfo,
      confidence
    };
  }

  /**
   * Batch process multiple transactions
   */
  public async batchProcessTransactions(
    transactions: Transaction[],
    availableCategories: Category[],
    existingPayees: Payee[],
    onProgress?: (progress: number) => void
  ): Promise<Map<number, CategorizationResult>> {
    const results = new Map<number, CategorizationResult>();

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const result = await this.processTransaction(
        transaction,
        availableCategories,
        existingPayees
      );

      if (transaction.transaction_id) {
        results.set(transaction.transaction_id, result);
      }

      if (onProgress) {
        onProgress(((i + 1) / transactions.length) * 100);
      }
    }

    return results;
  }

  /**
   * Extract payee information from transaction description
   */
  private extractPayeeInfo(
    description: string,
    existingPayees: Payee[]
  ): PayeeExtraction | null {
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

  /**
   * Match against existing payees
   */
  private matchExistingPayee(
    description: string,
    existingPayees: Payee[]
  ): { payee: Payee; confidence: number } | null {
    let bestMatch: { payee: Payee; confidence: number } | null = null;
    let bestScore = 0;

    const lowerDescription = description.toLowerCase();

    for (const payee of existingPayees) {
      const payeeName = payee.name.toLowerCase();

      // Exact match
      if (lowerDescription.includes(payeeName)) {
        const score = this.CONFIDENCE_EXACT_MATCH;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { payee, confidence: score };
        }
        continue;
      }

      // Fuzzy match
      const score = this.calculateFuzzyMatchScore(lowerDescription, payeeName);
      if (score > bestScore && score >= this.CONFIDENCE_FUZZY_MATCH) {
        bestScore = score;
        bestMatch = { payee, confidence: score };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate fuzzy match score between description and payee name
   */
  private calculateFuzzyMatchScore(description: string, payeeName: string): number {
    const words = description.split(/\s+/);
    const payeeWords = payeeName.split(/\s+/);

    let matchedWords = 0;
    const totalWords = payeeWords.length;

    for (const payeeWord of payeeWords) {
      for (const word of words) {
        if (word.includes(payeeWord) || payeeWord.includes(word)) {
          matchedWords++;
          break;
        }
      }
    }

    if (totalWords === 0) return 0;

    const matchRatio = matchedWords / totalWords;
    return matchRatio;
  }

  /**
   * Extract new payee from transaction description
   */
  private extractNewPayee(
    description: string
  ): { payee: Payee; confidence: number } | null {
    for (const pattern of this.descriptionPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const merchantName = this.cleanMerchantName(match[1]);
        const canonicalName = this.canonicalizeMerchantName(merchantName);

        if (canonicalName.length > 2) {
          const suggestedCategoryId = this.suggestCategoryIdForMerchant(
            canonicalName,
            description
          );

          return {
            payee: {
              name: canonicalName,
              default_category_id: suggestedCategoryId
            },
            confidence: this.CONFIDENCE_STRONG_PATTERN
          };
        }
      }
    }

    return null;
  }

  /**
   * Clean and normalize merchant name
   */
  private cleanMerchantName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s&']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => {
        if (word === '&') return '&';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Canonicalize merchant names for common chains (e.g. WF descriptions)
   * to avoid creating many near-duplicate payees like
   * "SHOPRITE SUTHBRY38 SOUTHBURY CT", "Shoprite 123", etc.
   */
  private canonicalizeMerchantName(name: string): string {
    const lower = name.toLowerCase();

    // Kleversolutions (various PayPal / Apple.com bill references)
    if (lower.includes('kleversolution')) {
      return 'Kleversolutions';
    }

    // Apple.com/Bill variants
    if (lower.includes('apple.com') || lower.includes('applecombill') || lower.includes('applecom bill')) {
      return 'Apple.com/Bill';
    }

    // Amazon (including Amazon Corp / payments)
    if (lower.includes('amazon')) {
      return 'Amazon';
    }

    // Shoprite (various store/location variants)
    if (lower.includes('shoprite')) {
      return 'Shoprite';
    }

    // Stop & Shop (store numbers / locations)
    if (lower.includes('stop') && lower.includes('shop')) {
      return 'Stop & Shop';
    }

    // Target.com / Target stores
    if (lower.includes('target')) {
      return 'Target';
    }

    // Disney Plus / Disney+ subscriptions
    if (lower.includes('disney') && lower.includes('plus')) {
      return 'Disney Plus';
    }

    // Eversource utility payments
    if (lower.includes('eversource')) {
      return 'Eversource';
    }

    // Starbucks
    if (lower.includes('starbucks')) {
      return 'Starbucks';
    }

    // McDonald’s
    if (lower.includes('mcdonald')) {
      return `McDonald's`;
    }

    // Fallback: use cleaned name as-is
    return name;
  }

  /**
   * Suggest category ID based on merchant name patterns
   */
  private suggestCategoryIdForMerchant(
    merchantName: string,
    description: string
  ): number | null {
    const lowerMerchant = merchantName.toLowerCase();
    const lowerDescription = description.toLowerCase();

    // Previously this method attempted to map merchant patterns directly to
    // hard-coded category IDs. With a configurable category taxonomy and
    // user-managed categories, fixed IDs are no longer safe or accurate.
    // Default categories for new payees should instead be established via
    // historical data and explicit user choices, so we do not guess an ID here.
    return null;
  }

  /**
   * Predict category for transaction
   */
  private predictCategory(
    description: string,
    amount: number,
    availableCategories: Category[],
    payeeExtraction: PayeeExtraction | null,
    transactionType?: string
  ): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];

    // Narrow category pool based on transaction type when available
    let candidateCategories = availableCategories;
    if (transactionType === 'income') {
      candidateCategories = availableCategories.filter(c => c.type === 'income');
    } else if (transactionType === 'expense') {
      candidateCategories = availableCategories.filter(c => c.type === 'expense');
    }

    // Use payee's default category if available
    if (payeeExtraction?.payee.default_category_id) {
      const defaultCategory = candidateCategories.find(
        c => c.category_id === payeeExtraction.payee.default_category_id
      );

      if (defaultCategory) {
        predictions.push({
          category: defaultCategory,
          confidence: this.CONFIDENCE_STRONG_PATTERN
        });
      }
    }

    // Pattern-based categorization
    const patternPredictions = this.getPatternBasedPredictions(
      description,
      candidateCategories,
      transactionType
    );
    predictions.push(...patternPredictions);

    // Amount-based heuristics
    const amountPredictions = this.getAmountBasedPredictions(
      amount,
      candidateCategories
    );
    predictions.push(...amountPredictions);

    // Remove duplicates, keeping highest confidence
    const uniquePredictions = new Map<number, CategoryPrediction>();
    for (const prediction of predictions) {
      const id = prediction.category.category_id!;
      const existing = uniquePredictions.get(id);

      if (!existing || prediction.confidence > existing.confidence) {
        uniquePredictions.set(id, prediction);
      }
    }

    // Sort by confidence and return top 3
    return Array.from(uniquePredictions.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Get pattern-based category predictions
   */
  private getPatternBasedPredictions(
    description: string,
    availableCategories: Category[],
    transactionType?: string
  ): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];
    const lowerDescription = description.toLowerCase();

    for (const [categoryType, patterns] of this.merchantPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(lowerDescription)) {
          // Find matching category
          const matchingCategory = this.findCategoryByType(
            categoryType,
            availableCategories,
            transactionType
          );

          if (matchingCategory) {
            predictions.push({
              category: matchingCategory,
              confidence: this.CONFIDENCE_GOOD_PATTERN
            });
            break; // One match per category type
          }
        }
      }
    }

    return predictions;
  }

  /**
   * Get amount-based category predictions
   */
  private getAmountBasedPredictions(
    amount: number,
    availableCategories: Category[]
  ): CategoryPrediction[] {
    const predictions: CategoryPrediction[] = [];
    const absAmount = Math.abs(amount);

    // Large amounts (>$1000) often indicate rent, mortgage, or major purchases
    if (absAmount >= 1000) {
      const housingCategory = availableCategories.find(c =>
        c.name.toLowerCase().includes('housing') ||
        c.name.toLowerCase().includes('rent') ||
        c.name.toLowerCase().includes('mortgage')
      );

      if (housingCategory) {
        predictions.push({
          category: housingCategory,
          confidence: this.CONFIDENCE_FUZZY_MATCH
        });
      }
    }

    // Small amounts (<$10) often indicate subscriptions or small purchases
    if (absAmount < 10) {
      const entertainmentCategory = availableCategories.find(c =>
        c.name.toLowerCase().includes('entertainment') ||
        c.name.toLowerCase().includes('subscription')
      );

      if (entertainmentCategory) {
        predictions.push({
          category: entertainmentCategory,
          confidence: this.CONFIDENCE_WEAK_MATCH
        });
      }
    }

    return predictions;
  }

  /**
   * Find category by type keyword
   */
  private findCategoryByType(
    categoryType: string,
    availableCategories: Category[],
    transactionType?: string
  ): Category | undefined {
    const canonicalFamilyMap: { [key: string]: string } = {
      'groceries': 'Groceries',
      'gas_fuel': 'Transportation',
      'restaurants': 'Food & Dining',
      'utilities': 'Bills & Utilities',
      'shopping': 'Shopping',
      'entertainment': 'Entertainment',
      'healthcare': 'Health & Fitness',
      'transportation': 'Transportation',
      'financial': 'Fees & Charges'
    };

    const typeKeywords: { [key: string]: string[] } = {
      'groceries': ['groceries', 'grocery', 'food', 'supermarket'],
      'gas_fuel': ['gas', 'fuel', 'auto', 'automotive', 'transportation'],
      'restaurants': ['restaurant', 'dining', 'food', 'eating'],
      'utilities': ['bills & utilities', 'utilities', 'utility', 'bills', 'services'],
      'shopping': ['shopping', 'retail', 'general', 'merchandise'],
      'entertainment': ['entertainment', 'recreation', 'leisure', 'fun'],
      'healthcare': ['health & fitness', 'healthcare', 'health', 'medical', 'pharmacy'],
      'transportation': ['transportation', 'transit', 'travel', 'commute'],
      'financial': ['fees & charges', 'financial', 'bank', 'fees', 'charges']
    };

    // Prefer categories whose type matches the transaction type when known
    const categoryPool =
      transactionType === 'income'
        ? availableCategories.filter(c => c.type === 'income')
        : transactionType === 'expense'
          ? availableCategories.filter(c => c.type === 'expense')
          : availableCategories;

    // First, try to resolve by canonical family name (e.g. "Shopping")
    const canonicalName = canonicalFamilyMap[categoryType];
    if (canonicalName) {
      const canonical = categoryPool.find(c =>
        c.name.toLowerCase() === canonicalName.toLowerCase()
      );
      if (canonical) {
        return canonical;
      }
    }

    const keywords = typeKeywords[categoryType] || [categoryType];

    for (const keyword of keywords) {
      const category = categoryPool.find(c =>
        c.name.toLowerCase().includes(keyword)
      );

      if (category) {
        return category;
      }
    }

    return undefined;
  }

  /**
   * Extract additional information from description
   */
  private extractAdditionalInfo(description: string): {
    merchant?: string;
    location?: string;
    paymentMethod?: string;
    transactionType?: string;
    keywords?: string[];
  } {
    const info: any = {};

    // Extract payment method
    if (/\bdebit\b/i.test(description)) {
      info.paymentMethod = 'Debit Card';
    } else if (/\bcredit\b/i.test(description)) {
      info.paymentMethod = 'Credit Card';
    } else if (/\b(check|ach)\b/i.test(description)) {
      info.paymentMethod = 'Check/ACH';
    } else if (/\batm\b/i.test(description)) {
      info.paymentMethod = 'ATM';
    }

    // Extract transaction type
    if (/\brefund\b/i.test(description)) {
      info.transactionType = 'Refund';
    } else if (/\bfee\b/i.test(description)) {
      info.transactionType = 'Fee';
    } else if (/\btransfer\b/i.test(description)) {
      info.transactionType = 'Transfer';
    } else if (/\bpayment\b/i.test(description)) {
      info.transactionType = 'Payment';
    } else if (/\bpurchase\b/i.test(description)) {
      info.transactionType = 'Purchase';
    }

    // Extract keywords
    const words = description
      .replace(/\d{2}\/\d{2}/g, '') // Remove dates
      .replace(/card\s*\d+/gi, '') // Remove card numbers
      .split(/\s+/)
      .filter(w => w.length > 3 && !/^\d+$/.test(w));

    info.keywords = words.slice(0, 5);

    return info;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    categoryPredictions: CategoryPrediction[],
    payeeExtraction: PayeeExtraction | null,
    extractedInfo: any
  ): number {
    let totalConfidence = 0;
    let components = 0;

    // Category confidence (weighted highest)
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
      totalConfidence += Math.min(0.8, infoCount * 0.15);
      components++;
    }

    if (components === 0) {
      return 0;
    }

    const average = totalConfidence / components;
    return Math.max(0, Math.min(1, average));
  }

  /**
   * Learn from user correction (for future enhancement)
   */
  public learnFromCorrection(
    transaction: Transaction,
    correctCategory: Category,
    correctPayee?: Payee
  ): void {
    // Phase 2+: Implement learning mechanism
    // - Store corrections in database
    // - Update pattern weights
    // - Improve matching algorithms
  }
}
