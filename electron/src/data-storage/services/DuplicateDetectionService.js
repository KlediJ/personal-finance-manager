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
exports.DuplicateDetectionService = void 0;
const DatabaseManager_1 = require("../database/DatabaseManager");
const DatabaseConnection_1 = require("../database/DatabaseConnection");
const Money_1 = require("../../utils/Money");
const crypto = __importStar(require("crypto"));
/**
 * DuplicateDetectionService provides comprehensive duplicate transaction detection
 * using fuzzy matching algorithms to prevent double-counting of income/expenses.
 *
 * Detection Strategy:
 * 1. Exact Match: Same amount, date, description, and account
 * 2. Probable Match: Same amount, date ±1 day, description similarity >80%
 * 3. Possible Match: Same amount, date ±2 days, description similarity >60%
 */
class DuplicateDetectionService {
    constructor() {
        this.databaseManager = DatabaseManager_1.DatabaseManager.getInstance();
        this.transactionRepository = this.databaseManager.getTransactionRepository();
    }
    /**
     * Detect potential duplicates for a new transaction
     * @param candidateTransaction Transaction to check for duplicates
     * @param options Detection options
     * @returns Duplicate detection result
     */
    detectDuplicates(candidateTransaction, options = {}) {
        const defaultOptions = {
            timeWindowHours: 48,
            exactMatchThreshold: 1.0,
            probableMatchThreshold: 0.8,
            possibleMatchThreshold: 0.6,
            checkDescription: true,
            checkAmount: true,
            checkDate: true,
            includeAccountId: true,
            ...options
        };
        // Generate hash for the candidate transaction
        const hash = this.generateTransactionHash(candidateTransaction);
        // Get potentially matching transactions within time window
        const candidateDate = new Date(candidateTransaction.date);
        const timeWindowMs = defaultOptions.timeWindowHours * 60 * 60 * 1000;
        const startDate = new Date(candidateDate.getTime() - timeWindowMs);
        const endDate = new Date(candidateDate.getTime() + timeWindowMs);
        const potentialMatches = this.getTransactionsInDateRange(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], candidateTransaction.account_id);
        // Analyze each potential match
        const matches = [];
        for (const existingTransaction of potentialMatches) {
            const matchResult = this.analyzeTransactionSimilarity(candidateTransaction, existingTransaction, defaultOptions);
            if (matchResult.confidence >= defaultOptions.possibleMatchThreshold) {
                matches.push(matchResult);
            }
        }
        // Sort matches by confidence (highest first)
        matches.sort((a, b) => b.confidence - a.confidence);
        // Determine overall result
        const highestConfidence = matches.length > 0 ? matches[0].confidence : 0;
        const isDuplicate = highestConfidence >= defaultOptions.possibleMatchThreshold;
        let recommendation = 'allow';
        if (highestConfidence >= defaultOptions.exactMatchThreshold) {
            recommendation = 'skip';
        }
        else if (highestConfidence >= defaultOptions.probableMatchThreshold) {
            recommendation = 'warn';
        }
        return {
            isDuplicate,
            matches,
            hash,
            recommendation
        };
    }
    /**
     * Analyze similarity between two transactions
     * @param candidate Candidate transaction
     * @param existing Existing transaction
     * @param options Detection options
     * @returns Duplicate match result
     */
    analyzeTransactionSimilarity(candidate, existing, options) {
        let totalScore = 0;
        let maxScore = 0;
        const matchingFields = [];
        // Amount comparison (highest weight: 40%)
        if (options.checkAmount) {
            const amountScore = this.compareAmounts(candidate.amount, existing.amount);
            totalScore += amountScore * 0.4;
            maxScore += 0.4;
            if (amountScore >= 0.95) {
                matchingFields.push('amount');
            }
        }
        // Date comparison (high weight: 30%)
        if (options.checkDate) {
            const dateScore = this.compareDates(candidate.date, existing.date, options.timeWindowHours);
            totalScore += dateScore * 0.3;
            maxScore += 0.3;
            if (dateScore >= 0.8) {
                matchingFields.push('date');
            }
        }
        // Description comparison (medium weight: 20%)
        if (options.checkDescription && candidate.description && existing.description) {
            const descriptionScore = this.compareDescriptions(candidate.description, existing.description);
            totalScore += descriptionScore * 0.2;
            maxScore += 0.2;
            if (descriptionScore >= 0.7) {
                matchingFields.push('description');
            }
        }
        else if (options.checkDescription) {
            maxScore += 0.2; // Penalize missing descriptions
        }
        // Account comparison (low weight: 10%)
        if (options.includeAccountId) {
            const accountScore = candidate.account_id === existing.account_id ? 1.0 : 0.0;
            totalScore += accountScore * 0.1;
            maxScore += 0.1;
            if (accountScore === 1.0) {
                matchingFields.push('account');
            }
        }
        // Normalize confidence score
        const confidence = maxScore > 0 ? totalScore / maxScore : 0;
        // Determine match type
        let matchType = 'possible';
        if (confidence >= options.exactMatchThreshold) {
            matchType = 'exact';
        }
        else if (confidence >= options.probableMatchThreshold) {
            matchType = 'probable';
        }
        return {
            confidence,
            matchType,
            transaction: existing,
            matchingFields,
            score: totalScore
        };
    }
    /**
     * Compare two amounts for similarity
     * @param amount1 First amount in cents
     * @param amount2 Second amount in cents
     * @returns Similarity score (0.0 to 1.0)
     */
    compareAmounts(amount1, amount2) {
        // Convert to absolute values for comparison
        const abs1 = Math.abs(amount1);
        const abs2 = Math.abs(amount2);
        // Exact match
        if (amount1 === amount2) {
            return 1.0;
        }
        // Same absolute amount but different signs (e.g., refund vs original charge)
        if (abs1 === abs2) {
            return 0.9;
        }
        // Calculate percentage difference
        const maxAmount = Math.max(abs1, abs2);
        if (maxAmount === 0)
            return amount1 === amount2 ? 1.0 : 0.0;
        const difference = Math.abs(abs1 - abs2);
        const percentageDiff = difference / maxAmount;
        // Score inversely proportional to percentage difference
        return Math.max(0, 1.0 - percentageDiff);
    }
    /**
     * Compare two dates for similarity within time window
     * @param date1 First date string (YYYY-MM-DD)
     * @param date2 Second date string (YYYY-MM-DD)
     * @param timeWindowHours Maximum time window in hours
     * @returns Similarity score (0.0 to 1.0)
     */
    compareDates(date1, date2, timeWindowHours) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        // Exact match
        if (date1 === date2) {
            return 1.0;
        }
        const diffMs = Math.abs(d1.getTime() - d2.getTime());
        const diffHours = diffMs / (1000 * 60 * 60);
        // Outside time window
        if (diffHours > timeWindowHours) {
            return 0.0;
        }
        // Linear decay within time window
        return Math.max(0, 1.0 - (diffHours / timeWindowHours));
    }
    /**
     * Compare two descriptions using Levenshtein distance
     * @param desc1 First description
     * @param desc2 Second description
     * @returns Similarity score (0.0 to 1.0)
     */
    compareDescriptions(desc1, desc2) {
        if (!desc1 || !desc2)
            return 0.0;
        // Normalize descriptions for comparison
        const normalized1 = this.normalizeDescription(desc1);
        const normalized2 = this.normalizeDescription(desc2);
        // Exact match after normalization
        if (normalized1 === normalized2) {
            return 1.0;
        }
        // Calculate Levenshtein distance
        const distance = this.levenshteinDistance(normalized1, normalized2);
        const maxLength = Math.max(normalized1.length, normalized2.length);
        if (maxLength === 0)
            return 1.0;
        // Convert distance to similarity score
        const similarity = 1.0 - (distance / maxLength);
        return Math.max(0, similarity);
    }
    /**
     * Normalize description for comparison
     * @param description Raw description
     * @returns Normalized description
     */
    normalizeDescription(description) {
        return description
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    /**
     * Calculate Levenshtein distance between two strings
     * @param str1 First string
     * @param str2 Second string
     * @returns Edit distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        // Initialize matrix
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        // Fill matrix
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Generate a hash for a transaction to enable fast duplicate checking
     * @param transaction Transaction to hash
     * @returns SHA-256 hash string
     */
    generateTransactionHash(transaction) {
        // Create a normalized string representation for hashing
        const hashData = {
            account_id: transaction.account_id,
            date: transaction.date,
            amount: transaction.amount,
            description: this.normalizeDescription(transaction.description || ''),
            type: transaction.transaction_type
        };
        const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    /**
     * Get transactions within a date range for an account
     * @param startDate Start date (YYYY-MM-DD)
     * @param endDate End date (YYYY-MM-DD)
     * @param accountId Account ID (optional)
     * @returns Transactions in date range
     */
    getTransactionsInDateRange(startDate, endDate, accountId) {
        if (accountId) {
            return this.transactionRepository.getByAccountId(accountId)
                .filter((t) => t.date >= startDate && t.date <= endDate);
        }
        else {
            return this.transactionRepository.getByDateRange(startDate, endDate);
        }
    }
    /**
     * Check if a transaction hash already exists
     * @param hash Transaction hash to check
     * @returns True if hash exists, false otherwise
     */
    checkHashExists(hash) {
        // This would query the database for the hash
        // For now, we'll implement this as a simple query
        const query = `
      SELECT COUNT(*) as count
      FROM transactions
      WHERE duplicate_hash = ?
    `;
        try {
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
            const result = db.prepare(query).get(hash);
            return result.count > 0;
        }
        catch (error) {
            console.warn('Hash check failed, hash column may not exist yet:', error);
            return false;
        }
    }
    /**
     * Batch detect duplicates for multiple transactions (useful for imports)
     * @param candidateTransactions Array of transactions to check
     * @param options Detection options
     * @returns Array of detection results
     */
    batchDetectDuplicates(candidateTransactions, options = {}) {
        console.log(`🔍 Starting batch duplicate detection for ${candidateTransactions.length} transactions`);
        const results = [];
        let duplicatesFound = 0;
        for (const [index, transaction] of candidateTransactions.entries()) {
            const result = this.detectDuplicates(transaction, options);
            results.push(result);
            if (result.isDuplicate) {
                duplicatesFound++;
                console.log(`⚠️  Duplicate detected [${index + 1}/${candidateTransactions.length}]: ${result.recommendation} - ${Money_1.Money.formatCents(transaction.amount)} on ${transaction.date}`);
            }
        }
        console.log(`✅ Batch duplicate detection completed: ${duplicatesFound} potential duplicates found out of ${candidateTransactions.length} transactions`);
        return results;
    }
    /**
     * Get duplicate detection statistics
     * @returns Statistics about duplicate detection
     */
    getDuplicateStatistics() {
        const totalTransactions = this.transactionRepository.getAll().length;
        // Count transactions with hashes (if column exists)
        let transactionsWithHashes = 0;
        try {
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
            const result = db
                .prepare('SELECT COUNT(*) as count FROM transactions WHERE duplicate_hash IS NOT NULL')
                .get();
            transactionsWithHashes = result.count;
        }
        catch (error) {
            // Hash column doesn't exist yet
            transactionsWithHashes = 0;
        }
        // Get account statistics
        const accounts = this.databaseManager.getAccountRepository().getAll();
        const averageTransactionsPerAccount = accounts.length > 0 ? totalTransactions / accounts.length : 0;
        return {
            totalTransactions,
            transactionsWithHashes,
            potentialDuplicateGroups: 0, // This would require more complex analysis
            averageTransactionsPerAccount
        };
    }
}
exports.DuplicateDetectionService = DuplicateDetectionService;
//# sourceMappingURL=DuplicateDetectionService.js.map