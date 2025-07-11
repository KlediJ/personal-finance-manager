"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCategorizer = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
class TransactionCategorizer {
    constructor() {
        this.model = null;
        this.vocabulary = new Map();
        this.categories = [];
        this.maxSequenceLength = 32;
        this.vocabSize = 10000;
        this.embeddingDim = 50;
        this.isModelLoaded = false;
        this.learningData = [];
        this.initializeModel();
    }
    async initializeModel() {
        try {
            // Try to load existing model from local storage
            const savedModel = await this.loadModelFromStorage();
            if (savedModel) {
                this.model = savedModel;
                this.isModelLoaded = true;
                console.log('Loaded existing AI model from storage');
                return;
            }
            // Create new model if no saved model exists
            await this.createNewModel();
            console.log('Created new AI categorization model');
        }
        catch (error) {
            console.error('Error initializing AI model:', error);
            // Fallback to rule-based categorization
            this.isModelLoaded = false;
        }
    }
    async loadModelFromStorage() {
        try {
            const modelData = localStorage.getItem('aiCategorizationModel');
            if (!modelData)
                return null;
            const parsedData = JSON.parse(modelData);
            // Load vocabulary
            this.vocabulary = new Map(parsedData.vocabulary);
            // Load model
            const model = await tf.loadLayersModel(tf.io.fromMemory(parsedData.model));
            return model;
        }
        catch (error) {
            console.error('Error loading model from storage:', error);
            return null;
        }
    }
    async createNewModel() {
        // Build vocabulary from common financial terms
        this.buildInitialVocabulary();
        // Create a simple neural network for text classification
        const model = tf.sequential({
            layers: [
                tf.layers.embedding({
                    inputDim: this.vocabSize,
                    outputDim: this.embeddingDim,
                    inputLength: this.maxSequenceLength
                }),
                tf.layers.globalAveragePooling1d(),
                tf.layers.dense({
                    units: 64,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({
                    units: 32,
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 1, // Will be updated based on number of categories
                    activation: 'softmax'
                })
            ]
        });
        // Compile model
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        this.model = model;
        this.isModelLoaded = true;
    }
    buildInitialVocabulary() {
        // Common financial terms and patterns
        const commonTerms = [
            // Grocery & Food
            'grocery', 'supermarket', 'food', 'restaurant', 'cafe', 'dining', 'lunch', 'dinner',
            'market', 'store', 'walmart', 'target', 'costco', 'safeway', 'kroger',
            // Transportation
            'gas', 'fuel', 'petrol', 'uber', 'lyft', 'taxi', 'parking', 'toll', 'metro',
            'bus', 'train', 'car', 'auto', 'repair', 'insurance', 'dmv',
            // Utilities
            'electric', 'electricity', 'water', 'internet', 'phone', 'mobile', 'cable',
            'utility', 'bill', 'payment', 'service',
            // Entertainment
            'movie', 'cinema', 'netflix', 'spotify', 'game', 'entertainment', 'subscription',
            'theater', 'concert', 'event', 'ticket',
            // Shopping
            'amazon', 'online', 'shopping', 'purchase', 'order', 'delivery', 'clothing',
            'electronics', 'home', 'garden', 'book', 'music',
            // Healthcare
            'medical', 'doctor', 'hospital', 'pharmacy', 'prescription', 'dental',
            'health', 'insurance', 'copay',
            // Financial
            'bank', 'atm', 'fee', 'interest', 'loan', 'credit', 'debit', 'transfer',
            'payment', 'deposit', 'withdrawal',
            // Income
            'salary', 'paycheck', 'income', 'wages', 'bonus', 'commission', 'refund',
            'tax', 'return', 'rebate'
        ];
        // Add terms to vocabulary with indices
        commonTerms.forEach((term, index) => {
            this.vocabulary.set(term.toLowerCase(), index + 1); // Start from 1, 0 is padding
        });
    }
    preprocessText(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
        const sequence = words.map(word => this.vocabulary.get(word) || 0);
        // Pad or truncate to maxSequenceLength
        if (sequence.length > this.maxSequenceLength) {
            return sequence.slice(0, this.maxSequenceLength);
        }
        else {
            return [...sequence, ...Array(this.maxSequenceLength - sequence.length).fill(0)];
        }
    }
    async categorizeTransaction(transaction, availableCategories) {
        this.categories = availableCategories;
        if (!this.isModelLoaded || !this.model) {
            // Fallback to rule-based categorization
            return this.ruleBasedCategorization(transaction, availableCategories);
        }
        try {
            // Preprocess transaction description
            const text = transaction.description || '';
            const sequence = this.preprocessText(text);
            // Create tensor and predict
            const inputTensor = tf.tensor2d([sequence], [1, this.maxSequenceLength]);
            const prediction = this.model.predict(inputTensor);
            const probabilities = await prediction.data();
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            // Convert probabilities to predictions
            const predictions = [];
            for (let i = 0; i < Math.min(probabilities.length, availableCategories.length); i++) {
                if (probabilities[i] > 0.1) { // Only include predictions with > 10% confidence
                    predictions.push({
                        category: availableCategories[i],
                        confidence: probabilities[i]
                    });
                }
            }
            // Sort by confidence and return top predictions
            return predictions
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3);
        }
        catch (error) {
            console.error('Error in AI categorization:', error);
            return this.ruleBasedCategorization(transaction, availableCategories);
        }
    }
    ruleBasedCategorization(transaction, availableCategories) {
        const description = transaction.description?.toLowerCase() || '';
        const predictions = [];
        // Rule-based matching with confidence scores
        const rules = [
            {
                keywords: ['grocery', 'supermarket', 'food', 'market', 'walmart', 'target', 'costco'],
                categoryNames: ['food', 'grocery', 'groceries'],
                confidence: 0.85
            },
            {
                keywords: ['restaurant', 'cafe', 'dining', 'lunch', 'dinner', 'pizza', 'burger'],
                categoryNames: ['dining', 'restaurant', 'food'],
                confidence: 0.80
            },
            {
                keywords: ['gas', 'fuel', 'petrol', 'shell', 'bp', 'chevron', 'exxon'],
                categoryNames: ['transportation', 'gas', 'fuel', 'auto'],
                confidence: 0.90
            },
            {
                keywords: ['uber', 'lyft', 'taxi', 'parking', 'toll'],
                categoryNames: ['transportation', 'travel', 'auto'],
                confidence: 0.85
            },
            {
                keywords: ['electric', 'electricity', 'water', 'internet', 'phone', 'cable'],
                categoryNames: ['utilities', 'bills', 'home'],
                confidence: 0.90
            },
            {
                keywords: ['amazon', 'shopping', 'online', 'purchase', 'order'],
                categoryNames: ['shopping', 'online', 'retail'],
                confidence: 0.75
            },
            {
                keywords: ['medical', 'doctor', 'hospital', 'pharmacy', 'dental'],
                categoryNames: ['healthcare', 'medical', 'health'],
                confidence: 0.85
            },
            {
                keywords: ['salary', 'paycheck', 'income', 'wages', 'bonus'],
                categoryNames: ['income', 'salary', 'wages'],
                confidence: 0.95
            }
        ];
        // Apply rules
        for (const rule of rules) {
            const hasKeyword = rule.keywords.some(keyword => description.includes(keyword));
            if (hasKeyword) {
                // Find matching category
                const matchingCategory = availableCategories.find(cat => rule.categoryNames.some(name => cat.name.toLowerCase().includes(name) || name.includes(cat.name.toLowerCase())));
                if (matchingCategory) {
                    predictions.push({
                        category: matchingCategory,
                        confidence: rule.confidence
                    });
                }
            }
        }
        // If no rules match, try fuzzy matching
        if (predictions.length === 0) {
            const fuzzyMatch = this.fuzzyMatchCategory(description, availableCategories);
            if (fuzzyMatch) {
                predictions.push(fuzzyMatch);
            }
        }
        return predictions.slice(0, 3);
    }
    fuzzyMatchCategory(description, availableCategories) {
        const words = description.split(/\s+/);
        let bestMatch = null;
        let bestScore = 0;
        for (const category of availableCategories) {
            const categoryWords = category.name.toLowerCase().split(/\s+/);
            let score = 0;
            for (const word of words) {
                for (const catWord of categoryWords) {
                    if (word.includes(catWord) || catWord.includes(word)) {
                        score += 0.3;
                    }
                }
            }
            if (score > bestScore && score > 0.2) {
                bestScore = score;
                bestMatch = {
                    category,
                    confidence: Math.min(score, 0.7) // Cap fuzzy confidence at 70%
                };
            }
        }
        return bestMatch;
    }
    async learnFromFeedback(feedback) {
        this.learningData.push(feedback);
        // If we have enough learning data, retrain the model
        if (this.learningData.length >= 20) {
            await this.incrementalTraining();
        }
    }
    async incrementalTraining() {
        if (!this.model || this.learningData.length === 0)
            return;
        try {
            // Prepare training data
            const trainingExamples = this.learningData.map(feedback => ({
                input: this.preprocessText(feedback.transaction.description || ''),
                output: this.categories.findIndex(cat => cat.category_id === feedback.expectedCategory.category_id)
            }));
            // Create training tensors
            const xs = tf.tensor2d(trainingExamples.map(ex => ex.input), [trainingExamples.length, this.maxSequenceLength]);
            const ys = tf.tensor2d(trainingExamples.map(ex => {
                const oneHot = Array(this.categories.length).fill(0);
                oneHot[ex.output] = 1;
                return oneHot;
            }), [trainingExamples.length, this.categories.length]);
            // Train model
            await this.model.fit(xs, ys, {
                epochs: 5,
                batchSize: 8,
                validationSplit: 0.2,
                verbose: 0
            });
            // Clean up tensors
            xs.dispose();
            ys.dispose();
            // Save updated model
            await this.saveModelToStorage();
            // Clear learning data
            this.learningData = [];
            console.log('Model updated with user feedback');
        }
        catch (error) {
            console.error('Error in incremental training:', error);
        }
    }
    async saveModelToStorage() {
        if (!this.model)
            return;
        try {
            const modelData = await this.model.save(tf.io.withSaveHandler(async (artifacts) => {
                return {
                    modelArtifactsInfo: {
                        dateSaved: new Date(),
                        modelTopologyType: 'JSON',
                        modelTopologyBytes: artifacts.modelTopology ?
                            JSON.stringify(artifacts.modelTopology).length : 0,
                        weightSpecsBytes: artifacts.weightSpecs ?
                            JSON.stringify(artifacts.weightSpecs).length : 0,
                        weightDataBytes: artifacts.weightData ? 1000 : 0,
                    },
                    ...artifacts
                };
            }));
            const storageData = {
                model: modelData,
                vocabulary: Array.from(this.vocabulary.entries()),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('aiCategorizationModel', JSON.stringify(storageData));
            console.log('AI model saved to local storage');
        }
        catch (error) {
            console.error('Error saving model to storage:', error);
        }
    }
    async batchCategorizeTransactions(transactions, availableCategories, onProgress) {
        const results = new Map();
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            const predictions = await this.categorizeTransaction(transaction, availableCategories);
            if (transaction.transaction_id) {
                results.set(transaction.transaction_id, predictions);
            }
            if (onProgress) {
                onProgress((i + 1) / transactions.length * 100);
            }
        }
        return results;
    }
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}
exports.TransactionCategorizer = TransactionCategorizer;
//# sourceMappingURL=TransactionCategorizer.js.map