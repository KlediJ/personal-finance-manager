/**
 * TransactionClassifier.ts
 * 
 * A lightweight ML-based classifier that categorizes financial transactions
 * based on their descriptions and uses the user's actual categories.
 */

import * as tf from '@tensorflow/tfjs';
import { Category } from '../../../data-storage/models/Category';

// Define interfaces
export interface TransactionData {
  description: string;
  amount: number;
  date?: string;
  transaction_type?: string;
  [key: string]: any;
}

export interface UserCategory {
  category_id: number;
  name: string;
  type: string;
  parent_id?: number | null;
}

export interface CategoryMatch {
  category_id: number;
  category_name: string;
  confidence: number;
  rule_match?: boolean;
}

export interface ClassifierOptions {
  minConfidence?: number;
  enableTensorFlow?: boolean;
  useCache?: boolean;
  categories?: Category[]; // Add user categories
}

export class TransactionClassifier {
  private static instance: TransactionClassifier;
  private initialized: boolean = false;
  private model: tf.LayersModel | null = null;
  private readonly options: ClassifierOptions;
  
  // User's categories
  private categories: UserCategory[] = [];
  
  // Cache for recent classifications
  private cache: Map<string, CategoryMatch> = new Map();
  
  // Private constructor for singleton
  private constructor(options: ClassifierOptions = {}) {
    this.options = {
      minConfidence: options.minConfidence || 0.6,
      enableTensorFlow: options.enableTensorFlow !== false,
      useCache: options.useCache !== false
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: ClassifierOptions): TransactionClassifier {
    if (!TransactionClassifier.instance) {
      TransactionClassifier.instance = new TransactionClassifier(options);
    }
    return TransactionClassifier.instance;
  }

  /**
   * Set the user's categories for classification
   */
  public setCategories(categories: UserCategory[]): void {
    this.categories = categories;
  }

  /**
   * Initialize the classifier
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (this.options.enableTensorFlow) {
        await this.initializeModel();
      }
      
      this.initialized = true;
      console.log('Transaction classifier initialized successfully');
    } catch (error) {
      console.error('Failed to initialize transaction classifier:', error);
      // Fall back to rule-based classification if ML fails
      this.options.enableTensorFlow = false;
      this.initialized = true;
    }
  }

  /**
   * Initialize TensorFlow model
   */
  private async initializeModel(): Promise<void> {
    try {
      // Load TensorFlow
      await tf.ready();
      
      // Create a simple model architecture
      const model = tf.sequential();
      model.add(tf.layers.dense({
        inputShape: [20], // Input features for text embedding
        units: 16,
        activation: 'relu'
      }));
      model.add(tf.layers.dense({
        units: 10, // Output units will be dynamically set based on categories
        activation: 'softmax'
      }));
      
      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      this.model = model;
      console.log('TensorFlow model created');
    } catch (error) {
      console.error('Failed to initialize TensorFlow model:', error);
      throw error;
    }
  }

  /**
   * Classify a transaction using user's categories
   * 
   * @param transaction The transaction data to classify
   * @returns The matched category with confidence score
   */
  public async classifyTransaction(transaction: TransactionData): Promise<CategoryMatch | null> {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Ensure we have categories to work with
    if (this.categories.length === 0) {
      console.warn('No categories available for classification');
      return null;
    }

    // Check cache if enabled
    if (this.options.useCache) {
      const cacheKey = this.getCacheKey(transaction);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Try rule-based classification first
    const ruleMatch = this.classifyByRules(transaction);
    
    // If rule-based classification is confident enough, return it
    if (ruleMatch && ruleMatch.confidence >= this.options.minConfidence!) {
      // Cache the result
      if (this.options.useCache) {
        const cacheKey = this.getCacheKey(transaction);
        this.cache.set(cacheKey, ruleMatch);
      }
      
      return ruleMatch;
    }

    // If TensorFlow is enabled, try ML-based classification
    if (this.options.enableTensorFlow && this.model) {
      try {
        const mlMatch = await this.classifyByML(transaction);
        
        // Combine with rule match if it exists
        const finalMatch = this.combineResults(ruleMatch, mlMatch);
        
        // Cache the result
        if (this.options.useCache) {
          const cacheKey = this.getCacheKey(transaction);
          this.cache.set(cacheKey, finalMatch);
        }
        
        return finalMatch;
      } catch (error) {
        console.error('Error in ML classification:', error);
        // Fall back to rule-based if it exists
        if (ruleMatch) {
          return ruleMatch;
        }
      }
    }

    // Fall back to rule match even if confidence is low
    return ruleMatch;
  }

  /**
   * Apply rule-based classification using the user's categories
   */
  private classifyByRules(transaction: TransactionData): CategoryMatch | null {
    if (!transaction.description || this.categories.length === 0) return null;
    
    const description = transaction.description.toLowerCase();
    let bestMatch: CategoryMatch | null = null;
    let bestConfidence = 0;
    
    // Pre-filter by transaction type if available
    let eligibleCategories = this.categories;
    if (transaction.transaction_type) {
      const txType = transaction.transaction_type.toLowerCase();
      eligibleCategories = this.categories.filter(cat => {
        // Map transaction_type to category type
        if (txType === 'income' && cat.type === 'income') return true;
        if ((txType === 'expense' || txType === 'payment') && cat.type === 'expense') return true;
        return false;
      });
      
      // If no categories match the type, use all categories
      if (eligibleCategories.length === 0) {
        eligibleCategories = this.categories;
      }
    }
    
    // Check each category name against the description
    for (const category of eligibleCategories) {
      const categoryTerms = this.extractTerms(category.name);
      
      // Count how many terms from the category name appear in the description
      let matchCount = 0;
      let totalTerms = 0;
      
      for (const term of categoryTerms) {
        if (term.length < 3) continue; // Skip very short terms
        totalTerms++;
        
        if (description.includes(term)) {
          matchCount++;
        }
      }
      
      // Calculate a confidence score
      let confidence = 0;
      if (totalTerms > 0) {
        // Base confidence on term matches
        confidence = matchCount / totalTerms;
        
        // Boost for exact matches
        if (description === category.name.toLowerCase()) {
          confidence = 0.95;
        }
        // Boost for substring match
        else if (description.includes(category.name.toLowerCase())) {
          confidence = Math.min(0.9, confidence + 0.3);
        }
        // Penalize very short descriptions to avoid false positives
        if (description.length < 5) {
          confidence *= 0.7;
        }
      }
      
      // Keep the best match
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = {
          category_id: category.category_id,
          category_name: category.name,
          confidence: confidence,
          rule_match: true
        };
      }
    }
    
    // Only return matches with reasonable confidence
    if (bestMatch && bestMatch.confidence >= 0.3) {
      return bestMatch;
    }
    
    return null;
  }

  /**
   * Extract terms from a string for matching
   */
  private extractTerms(text: string): string[] {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)             // Split on whitespace
      .filter(t => t.length > 0); // Remove empty strings
  }

  /**
   * Apply ML-based classification
   */
  private async classifyByML(transaction: TransactionData): Promise<CategoryMatch | null> {
    if (!this.model || this.categories.length === 0) return null;
    
    try {
      // Create a basic embedding for the description
      const embedding = this.createTextEmbedding(transaction.description);
      
      // Add other transaction features
      const features = [...embedding];
      
      // Add amount features
      if (transaction.amount) {
        // Normalize amount to a range like 0-1
        const normalizedAmount = Math.min(Math.abs(transaction.amount) / 1000, 1);
        features.push(normalizedAmount);
        
        // Add sign feature
        features.push(transaction.amount > 0 ? 1 : 0);
      } else {
        // Placeholders if no amount
        features.push(0);
        features.push(0);
      }
      
      // Transaction type feature
      if (transaction.transaction_type === 'income') {
        features.push(1);
        features.push(0);
      } else if (transaction.transaction_type === 'expense') {
        features.push(0);
        features.push(1);
      } else {
        features.push(0);
        features.push(0);
      }
      
      // Make prediction
      const inputTensor = tf.tensor2d([features]);
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      
      // Get predicted class and confidence
      const predictionData = await prediction.data();
      const predictionArray = Array.from(predictionData);
      
      // Find max confidence and index
      let maxConfidence = 0;
      let maxIndex = 0;
      
      predictionArray.forEach((confidence, index) => {
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          maxIndex = index;
        }
      });
      
      // Clean up tensors to prevent memory leaks
      inputTensor.dispose();
      prediction.dispose();
      
      // Map index to category
      if (maxIndex < this.categories.length) {
        const matchedCategory = this.categories[maxIndex];
        
        // Return if confidence is too low
        if (maxConfidence < this.options.minConfidence!) {
          return null;
        }
        
        // Return the category match
        return {
          category_id: matchedCategory.category_id,
          category_name: matchedCategory.name,
          confidence: maxConfidence
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in ML classification:', error);
      return null;
    }
  }

  /**
   * Create a very simple text embedding for a string
   * This is a simplified version - in production, you would use a proper text embedding model
   */
  private createTextEmbedding(text: string): number[] {
    // Create a fixed-size embedding (18 features)
    const embedding = new Array(18).fill(0);
    
    if (!text) return embedding;
    
    // Very simple character frequency embedding
    const lowerText = text.toLowerCase();
    
    // Check for common words/patterns in different categories
    const patterns = [
      // Common grocery terms
      /grocery|food|supermarket|market|shop/,
      // Restaurants
      /restaurant|café|cafe|dining|lunch|dinner|breakfast|food|coffee/,
      // Utilities
      /electric|gas|water|internet|phone|utility|bill/,
      // Transportation
      /gas|fuel|auto|car|uber|lyft|taxi|transport|train|bus|subway/,
      // Housing
      /rent|mortgage|home|house|apartment|condo|housing/,
      // Entertainment
      /movie|theater|cinema|concert|show|entertainment|netflix|spotify|hulu/,
      // Shopping
      /shopping|store|mall|amazon|shop|buy|purchase/,
      // Health
      /health|doctor|medical|dental|hospital|clinic|pharmacy/,
      // Personal care
      /haircut|salon|spa|gym|fitness|personal/,
      // Education
      /school|college|university|tuition|education|course|class/,
      // Income
      /salary|wage|income|deposit|payment|paycheck/,
      // Transfer
      /transfer|account|bank|savings|checking/
    ];
    
    // Check for pattern matches
    patterns.forEach((pattern, index) => {
      if (pattern.test(lowerText)) {
        embedding[index] = 1;
      }
    });
    
    // Add some basic text features
    embedding[12] = Math.min(text.length / 50, 1); // Normalized length
    embedding[13] = /\d/.test(text) ? 1 : 0;      // Contains numbers
    embedding[14] = /\$|€|£|¥/.test(text) ? 1 : 0; // Contains currency symbols
    
    // Add word count feature
    const wordCount = text.split(/\s+/).length;
    embedding[15] = Math.min(wordCount / 10, 1);
    
    // Add capitalization feature
    embedding[16] = /[A-Z]/.test(text) ? 1 : 0;
    
    // Add special character feature
    embedding[17] = /[^\w\s]/.test(text) ? 1 : 0;
    
    return embedding;
  }

  /**
   * Combine rule-based and ML results to get the best classification
   */
  private combineResults(
    ruleMatch: CategoryMatch | null, 
    mlMatch: CategoryMatch | null
  ): CategoryMatch | null {
    // If only one match exists, return it
    if (!ruleMatch) return mlMatch;
    if (!mlMatch) return ruleMatch;
    
    // If both exist, use the one with higher confidence
    if (ruleMatch.confidence > mlMatch.confidence) {
      // Boost confidence if ML agrees with rules
      if (ruleMatch.category_id === mlMatch.category_id) {
        return {
          ...ruleMatch,
          confidence: Math.min(0.99, ruleMatch.confidence + 0.1)
        };
      }
      return ruleMatch;
    } else {
      return mlMatch;
    }
  }

  /**
   * Generate a cache key for a transaction
   */
  private getCacheKey(transaction: TransactionData): string {
    // Generate a key based on the most important fields
    const descKey = transaction.description?.toLowerCase().trim() || '';
    const amountKey = transaction.amount?.toString() || '';
    return `${descKey}|${amountKey}`;
  }

  /**
   * Clear the classifier cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
