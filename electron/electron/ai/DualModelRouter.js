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
exports.DualModelRouter = exports.QueryType = void 0;
const ModelManager_1 = require("./ModelManager");
var QueryType;
(function (QueryType) {
    QueryType["TRANSACTION_CATEGORIZATION"] = "categorization";
    QueryType["PAYEE_EXTRACTION"] = "payee_extraction";
    QueryType["COMPLEX_QUERY"] = "complex_query";
    QueryType["FINANCIAL_ANALYSIS"] = "financial_analysis";
    QueryType["RELATIONSHIP_NAVIGATION"] = "relationship_navigation";
    QueryType["OPTIMIZATION"] = "optimization";
})(QueryType || (exports.QueryType = QueryType = {}));
class DualModelRouter {
    constructor() {
        this.modelManager = ModelManager_1.ModelManager.getInstance();
    }
    static getInstance() {
        if (!DualModelRouter.instance) {
            DualModelRouter.instance = new DualModelRouter();
        }
        return DualModelRouter.instance;
    }
    async routeQuery(input, context) {
        const startTime = Date.now();
        try {
            // Analyze query intent
            const intent = this.analyzeQueryIntent(input, context);
            // Route to appropriate model
            let response;
            switch (intent.modelRequired) {
                case 'mistral':
                    response = await this.processMistralQuery(input, intent, context);
                    break;
                case 'codellama':
                    response = await this.processCodeLlamaQuery(input, intent, context);
                    break;
                case 'both':
                    response = await this.processDualModelQuery(input, intent, context);
                    break;
                default:
                    throw new Error(`Unknown model requirement: ${intent.modelRequired}`);
            }
            response.processingTime = Date.now() - startTime;
            return response;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                modelUsed: 'none',
                processingTime: Date.now() - startTime
            };
        }
    }
    analyzeQueryIntent(input, context) {
        // Handle different input types
        if (typeof input === 'object' && input.description) {
            // Transaction categorization/payee extraction
            return {
                type: QueryType.TRANSACTION_CATEGORIZATION,
                confidence: 0.95,
                modelRequired: 'mistral',
                context: input
            };
        }
        if (typeof input === 'string') {
            const query = input.toLowerCase();
            // Complex financial queries requiring database navigation
            if (this.isComplexFinancialQuery(query)) {
                return {
                    type: QueryType.COMPLEX_QUERY,
                    confidence: 0.9,
                    modelRequired: 'codellama',
                    context: { query }
                };
            }
            // Financial analysis queries
            if (this.isFinancialAnalysisQuery(query)) {
                return {
                    type: QueryType.FINANCIAL_ANALYSIS,
                    confidence: 0.85,
                    modelRequired: 'codellama',
                    context: { query }
                };
            }
            // Relationship navigation queries
            if (this.isRelationshipQuery(query)) {
                return {
                    type: QueryType.RELATIONSHIP_NAVIGATION,
                    confidence: 0.8,
                    modelRequired: 'codellama',
                    context: { query }
                };
            }
            // Optimization queries
            if (this.isOptimizationQuery(query)) {
                return {
                    type: QueryType.OPTIMIZATION,
                    confidence: 0.85,
                    modelRequired: 'both',
                    context: { query }
                };
            }
            // Default to simple query
            return {
                type: QueryType.COMPLEX_QUERY,
                confidence: 0.7,
                modelRequired: 'codellama',
                context: { query }
            };
        }
        // Default fallback
        return {
            type: QueryType.COMPLEX_QUERY,
            confidence: 0.5,
            modelRequired: 'codellama',
            context: input
        };
    }
    isComplexFinancialQuery(query) {
        const complexPatterns = [
            /\b(loans?|credit|interest|amortization|payment schedule)\b/i,
            /\b(bills?|recurring|subscription|due dates?)\b/i,
            /\b(optimization|strategy|payoff|debt consolidation)\b/i,
            /\b(highest|lowest|average|total|sum|calculate)\b.*\b(interest|rate|balance)\b/i,
            /\b(relationship|connection|linked|associated)\b/i,
            /\b(forecast|predict|projection|trend)\b/i
        ];
        return complexPatterns.some(pattern => pattern.test(query));
    }
    isFinancialAnalysisQuery(query) {
        const analysisPatterns = [
            /\b(analyze|analysis|breakdown|summary)\b/i,
            /\b(spending pattern|expense trend|income analysis)\b/i,
            /\b(budget performance|over.*budget|under.*budget)\b/i,
            /\b(category breakdown|expense categories)\b/i,
            /\b(financial health|debt ratio|utilization)\b/i
        ];
        return analysisPatterns.some(pattern => pattern.test(query));
    }
    isRelationshipQuery(query) {
        const relationshipPatterns = [
            /\b(which.*connected|what.*linked|related.*to)\b/i,
            /\b(show.*relationship|navigate.*between)\b/i,
            /\b(account.*bills|loan.*payments|credit.*transactions)\b/i,
            /\b(payee.*categories|merchant.*patterns)\b/i
        ];
        return relationshipPatterns.some(pattern => pattern.test(query));
    }
    isOptimizationQuery(query) {
        const optimizationPatterns = [
            /\b(optimize|optimization|improve|better|best)\b/i,
            /\b(pay.*off|payoff|strategy|plan)\b/i,
            /\b(save.*money|reduce.*expense|minimize.*cost)\b/i,
            /\b(consolidate|refinance|restructure)\b/i,
            /\b(recommend|suggest|advice|should)\b/i
        ];
        return optimizationPatterns.some(pattern => pattern.test(query));
    }
    async processMistralQuery(input, intent, context) {
        try {
            // Import and use the actual MistralProcessor
            const { MistralProcessor } = await Promise.resolve().then(() => __importStar(require('../../src/data-processing/ai/MistralProcessor')));
            const mistralProcessor = new MistralProcessor();
            // For transaction categorization
            if (intent.type === QueryType.TRANSACTION_CATEGORIZATION && input.description) {
                const result = await mistralProcessor.processTransaction(input, [], []);
                return {
                    success: true,
                    data: {
                        type: 'categorization',
                        content: `Transaction categorized as ${result.categoryPredictions[0]?.category?.name || 'Unknown'}`,
                        predictions: result.categoryPredictions,
                        payeeExtraction: result.payeeExtraction,
                        extractedInfo: result.extractedInfo
                    },
                    modelUsed: 'mistral-7b',
                    processingTime: 0,
                    confidence: result.confidence
                };
            }
            // For other queries, use simulation for now
            const result = await this.simulateMistralProcessing(input, intent, context);
            return {
                success: true,
                data: result,
                modelUsed: 'mistral-7b',
                processingTime: 0,
                confidence: intent.confidence
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Mistral processing error',
                modelUsed: 'mistral-7b',
                processingTime: 0
            };
        }
    }
    async processCodeLlamaQuery(input, intent, context) {
        try {
            // Import and use the actual CodeLlamaProcessor
            const { CodeLlamaProcessor } = await Promise.resolve().then(() => __importStar(require('../../src/data-processing/ai/CodeLlamaProcessor')));
            // Create empty financial context for now
            const emptyContext = {
                transactions: [],
                categories: [],
                accounts: [],
                payees: []
            };
            const codeLlamaProcessor = new CodeLlamaProcessor(emptyContext);
            // For complex queries, use the actual processor
            if (typeof input === 'string' && intent.type === QueryType.COMPLEX_QUERY) {
                const result = await codeLlamaProcessor.processComplexQuery(input);
                return {
                    success: true,
                    data: {
                        type: result.type,
                        content: result.content,
                        data: result.data,
                        actionItems: result.actionItems
                    },
                    modelUsed: 'codellama-7b',
                    processingTime: 0,
                    confidence: result.confidence
                };
            }
            // For other queries, use simulation for now
            const result = await this.simulateCodeLlamaProcessing(input, intent, context);
            return {
                success: true,
                data: result,
                modelUsed: 'codellama-7b',
                processingTime: 0,
                confidence: intent.confidence
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'CodeLlama processing error',
                modelUsed: 'codellama-7b',
                processingTime: 0
            };
        }
    }
    async processDualModelQuery(input, intent, context) {
        try {
            // First, use Mistral for initial processing
            const mistralResponse = await this.processMistralQuery(input, intent, context);
            // Then, use CodeLlama for complex analysis
            const codeLlamaResponse = await this.processCodeLlamaQuery(input, intent, context);
            // Combine results
            const combinedResult = {
                mistralData: mistralResponse.data,
                codeLlamaData: codeLlamaResponse.data,
                combined: true
            };
            return {
                success: mistralResponse.success && codeLlamaResponse.success,
                data: combinedResult,
                modelUsed: 'mistral-7b+codellama-7b',
                processingTime: 0,
                confidence: Math.min(mistralResponse.confidence || 0, codeLlamaResponse.confidence || 0)
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Dual model processing error',
                modelUsed: 'mistral-7b+codellama-7b',
                processingTime: 0
            };
        }
    }
    async simulateMistralProcessing(input, intent, context) {
        // Simulate Mistral 7B processing for transaction categorization and payee extraction
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
        if (intent.type === QueryType.TRANSACTION_CATEGORIZATION) {
            return {
                category: 'Food & Dining',
                categoryConfidence: 0.92,
                payee: 'Restaurant XYZ',
                payeeConfidence: 0.88,
                extractedInfo: {
                    merchant: 'Restaurant XYZ',
                    location: 'Downtown',
                    paymentMethod: 'Credit Card'
                }
            };
        }
        return {
            processed: true,
            model: 'mistral-7b',
            result: 'Processed by Mistral model'
        };
    }
    async simulateCodeLlamaProcessing(input, intent, context) {
        // Simulate CodeLlama 7B processing for complex financial queries
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate processing time
        if (intent.type === QueryType.COMPLEX_QUERY) {
            return {
                analysis: 'Complex financial analysis completed',
                recommendations: [
                    'Consider consolidating high-interest debt',
                    'Increase emergency fund to 6 months expenses',
                    'Review investment allocation'
                ],
                calculations: {
                    totalDebt: 15000,
                    averageInterestRate: 0.18,
                    monthlyPayment: 450,
                    payoffTime: 48
                }
            };
        }
        return {
            processed: true,
            model: 'codellama-7b',
            result: 'Processed by CodeLlama model'
        };
    }
    async getModelHealth() {
        const mistralStatus = this.modelManager.getModelStatus('mistral-7b');
        const codeLlamaStatus = this.modelManager.getModelStatus('codellama-7b');
        return {
            mistral: mistralStatus?.loaded || false,
            codellama: codeLlamaStatus?.loaded || false,
            overall: (mistralStatus?.loaded || false) && (codeLlamaStatus?.loaded || false)
        };
    }
}
exports.DualModelRouter = DualModelRouter;
//# sourceMappingURL=DualModelRouter.js.map