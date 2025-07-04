import * as tf from '@tensorflow/tfjs';

// List of common expense categories
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Restaurants',
  'Shopping',
  'Entertainment',
  'Transportation',
  'Travel',
  'Utilities',
  'Rent',
  'Mortgage',
  'Insurance',
  'Medical',
  'Education',
  'Personal Care',
  'Gifts & Donations',
  'Investments',
  'Bills & Utilities',
  'Home',
  'Auto & Transport',
  'Fees & Charges',
  'Taxes',
  'Business Services',
  'Uncategorized'
];

// Word embeddings for common merchant names and terms
const KEYWORD_EMBEDDINGS: Record<string, number[]> = {};
let MODEL: tf.LayersModel | null = null;
let MODEL_LOADED = false;
let IS_LOADING = false;

/**
 * This classifier uses a hybrid approach combining rules and ML
 * Rule-based matching is used for common patterns, and ML is used for ambiguous cases
 */
export class TransactionClassifier {
  // Feature extraction
  private static extractFeatures(description: string): string[] {
    // Normalize and tokenize the description
    const normalizedText = description.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
      
    // Extract tokens
    const tokens = normalizedText.split(' ').filter(t => t.length > 1);
    
    // Extract potential merchant names using common patterns
    const merchantPatterns = [
      /^(?:purchase\s+)?(?:at|from|to)?\s+([a-z0-9]+)/i,  // "at MERCHANT" or "from MERCHANT"
      /^([a-z0-9]+)\s+(?:payment|charge|debit|credit)/i,   // "MERCHANT payment"
      /^txn\*\s*([a-z0-9]+)/i,                           // "TXN* MERCHANT"
      /^pos\s+purchase\s+([a-z0-9]+)/i,                   // "POS Purchase MERCHANT"
      /([a-z0-9]+\s+(?:market|store|shop|restaurant|cafe|inc|llc))/i  // "MERCHANT market/store/etc"
    ];
    
    const merchants = merchantPatterns
      .map(pattern => {
        const match = normalizedText.match(pattern);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];
    
    return [...tokens, ...merchants];
  }
  
  // Rule-based categorization
  private static categoryRules: Record<string, string[]> = {
    'Groceries': ['grocery', 'supermarket', 'food', 'market', 'walmart', 'target', 'safeway', 'kroger', 'aldi', 'trader', 'costco', 'wholefds'],
    'Restaurants': ['restaurant', 'cafe', 'coffee', 'dining', 'bar', 'starbucks', 'mcdonald', 'chipotle', 'burger', 'pizza', 'doordash', 'ubereats', 'grubhub'],
    'Transportation': ['uber', 'lyft', 'taxi', 'transit', 'transport', 'metro', 'subway', 'bus', 'train', 'parking', 'gas', 'petrol', 'fuel'],
    'Utilities': ['utility', 'electric', 'water', 'gas', 'power', 'energy', 'internet', 'wifi', 'phone', 'mobile', 'verizon', 'at&t', 'comcast', 'xfinity'],
    'Shopping': ['amazon', 'ebay', 'shop', 'store', 'mall', 'retail', 'clothing', 'shoes', 'apple', 'best buy', 'target', 'walmart'],
    'Travel': ['hotel', 'motel', 'airbnb', 'flight', 'airline', 'delta', 'united', 'american', 'southwest', 'travel', 'vacation', 'booking', 'expedia', 'airfare'],
    'Entertainment': ['movie', 'cinema', 'theater', 'netflix', 'hulu', 'disney', 'spotify', 'pandora', 'cable', 'subscription', 'game', 'hbo', 'amz prime'],
    'Medical': ['doctor', 'hospital', 'clinic', 'dental', 'pharmacy', 'medical', 'health', 'cvs', 'walgreens', 'rite aid'],
    'Insurance': ['insurance', 'geico', 'progressive', 'allstate', 'state farm', 'nationwide'],
    'Rent': ['rent', 'apartment', 'lease', 'housing'],
    'Mortgage': ['mortgage', 'home loan'],
    'Education': ['school', 'college', 'university', 'tuition', 'education', 'student', 'book', 'course', 'class'],
    'Personal Care': ['haircut', 'salon', 'spa', 'barber', 'beauty', 'cosmetic', 'fitness', 'gym'],
    'Gifts & Donations': ['gift', 'donation', 'charity', 'donate'],
    'Investments': ['investment', 'stock', 'etf', 'fund', 'dividend', 'brokerage', 'fidelity', 'schwab', 'vanguard'],
    'Fees & Charges': ['fee', 'service charge', 'atm fee', 'late fee', 'interest', 'penalty', 'overdraft'],
    'Bills & Utilities': ['bill', 'payment', 'monthly', 'subscription']
  };
  
  /**
   * Check if model is loaded or loading
   */
  static isModelLoaded(): boolean {
    return MODEL_LOADED;
  }
  
  /**
   * Check if model is currently loading
   */
  static isModelLoading(): boolean {
    return IS_LOADING;
  }
  
  /**
   * Load the TensorFlow.js model for transaction classification
   * Returns immediately if model is already loaded or loading
   */
  static async loadModel(): Promise<void> {
    // Return if model is already loaded or being loaded
    if (MODEL_LOADED || IS_LOADING) return;
    
    try {
      IS_LOADING = true;
      console.log('Loading transaction classifier model...');
      
      // Load TensorFlow.js
      await tf.ready();
      
      // For now, we'll create a simple model on the fly
      // In a real implementation, you'd load a pre-trained model
      const model = tf.sequential();
      model.add(tf.layers.dense({
        inputShape: [10],
        units: 50,
        activation: 'relu'
      }));
      model.add(tf.layers.dense({
        units: EXPENSE_CATEGORIES.length,
        activation: 'softmax'
      }));
      
      // Compile the model
      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      MODEL = model;
      MODEL_LOADED = true;
      console.log('Transaction classifier model loaded');
    } catch (error) {
      console.error('Error loading transaction classifier model:', error);
      throw error;
    } finally {
      IS_LOADING = false;
    }
  }
  
  /**
   * Classify a transaction based on its description
   * Uses a hybrid approach (rules + ML) for better performance
   * 
   * @param description Transaction description text
   * @param amount Transaction amount (optional, for better accuracy)
   * @returns Best matching category
   */
  static classifyTransaction(description: string, amount?: number): string {
    if (!description) return 'Uncategorized';
    
    const tokens = this.extractFeatures(description.toLowerCase());
    
    // First, try rule-based matching for common cases
    for (const [category, keywords] of Object.entries(this.categoryRules)) {
      for (const keyword of keywords) {
        if (description.toLowerCase().includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    
    // For more ambiguous cases, we'd use the ML model
    // In this prototype version, if we couldn't match with rules,
    // we'll just return a sensible default
    return 'Uncategorized';
  }
  
  /**
   * Predict categories using ML (to be implemented fully)
   * Currently returns a placeholder as the ML part is a stub
   */
  static async predictCategory(description: string): Promise<{
    category: string;
    confidence: number;
    alternatives: Array<{category: string, confidence: number}>
  }> {
    // Ensure model is loaded
    if (!MODEL_LOADED && !IS_LOADING) {
      await this.loadModel();
    }
    
    // In a real implementation, this would:
    // 1. Extract features from the description
    // 2. Convert to tensor
    // 3. Get predictions from the model
    // 4. Return top categories with confidence scores
    
    // For now, return a placeholder result
    return {
      category: this.classifyTransaction(description),
      confidence: 0.8,
      alternatives: [
        { category: 'Uncategorized', confidence: 0.1 },
        { category: 'Shopping', confidence: 0.05 },
        { category: 'Fees & Charges', confidence: 0.05 }
      ]
    };
  }
  
  /**
   * Batch classify multiple transactions
   * More efficient than calling classifyTransaction repeatedly
   */
  static batchClassify(descriptions: string[]): string[] {
    return descriptions.map(desc => this.classifyTransaction(desc));
  }
}
