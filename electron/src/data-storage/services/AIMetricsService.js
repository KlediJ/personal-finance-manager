"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMetricsService = void 0;
const AIRepository_1 = require("../repositories/AIRepository");
class AIMetricsService {
    constructor() {
        this.aiRepo = new AIRepository_1.AIRepository();
    }
    /**
     * Track categorization accuracy for a specific prediction
     */
    async trackCategorization(modelName, inputData, expectedOutput, actualOutput, confidence, processingTime, wasCorrect, userCorrection) {
        // Store learning data
        await this.aiRepo.storeLearningData({
            model_name: modelName,
            input_data: inputData,
            expected_output: expectedOutput,
            actual_output: actualOutput,
            feedback_type: 'categorization',
            confidence_score: confidence,
            was_correct: wasCorrect ? 1 : 0,
            user_correction: userCorrection,
            processing_time: processingTime
        });
        // Update performance metrics
        await this.updateCategorizationMetrics(modelName);
    }
    /**
     * Track caching performance
     */
    async trackCachePerformance(modelName, wasHit, responseTime) {
        await this.aiRepo.storeMetric({
            model_name: modelName,
            metric_type: 'caching',
            metric_name: 'cache_hit',
            metric_value: wasHit ? 1 : 0
        });
        await this.aiRepo.storeMetric({
            model_name: modelName,
            metric_type: 'caching',
            metric_name: 'response_time',
            metric_value: responseTime
        });
    }
    /**
     * Track overall processing time for any operation
     */
    async trackProcessingTime(modelName, operationType, timeMs) {
        await this.aiRepo.storeMetric({
            model_name: modelName,
            metric_type: 'performance',
            metric_name: `${operationType}_time`,
            metric_value: timeMs
        });
    }
    /**
     * Store user feedback for learning
     */
    async storeUserFeedback(modelName, transactionId, originalPrediction, userCorrection, confidence) {
        await this.aiRepo.storeLearningData({
            model_name: modelName,
            input_data: `transaction_${transactionId}`,
            expected_output: userCorrection,
            actual_output: originalPrediction,
            feedback_type: 'user_correction',
            confidence_score: confidence,
            was_correct: 0,
            user_correction: userCorrection,
            transaction_id: transactionId
        });
        // Track that we received feedback
        await this.aiRepo.storeMetric({
            model_name: modelName,
            metric_type: 'learning',
            metric_name: 'feedback_received',
            metric_value: 1
        });
    }
    /**
     * Get categorization metrics for a model
     */
    async getCategorizationMetrics(modelName, days = 30) {
        const accuracy = this.aiRepo.getModelAccuracy(modelName, days) || 0;
        // Get learning data for the period
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const learningData = this.aiRepo.getLearningDataForModel(modelName, 'categorization');
        const recentData = learningData.filter(d => new Date(d.created_at) >= startDate);
        const totalPredictions = recentData.length;
        const correctPredictions = recentData.filter(d => d.was_correct === 1).length;
        const averageConfidence = recentData.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / totalPredictions || 0;
        const averageProcessingTime = recentData.reduce((sum, d) => sum + (d.processing_time || 0), 0) / totalPredictions || 0;
        // Calculate improvement rate (compare first half vs second half of period)
        const midPoint = Math.floor(recentData.length / 2);
        const firstHalf = recentData.slice(0, midPoint);
        const secondHalf = recentData.slice(midPoint);
        const firstHalfAccuracy = firstHalf.length > 0 ?
            (firstHalf.filter(d => d.was_correct === 1).length / firstHalf.length) * 100 : 0;
        const secondHalfAccuracy = secondHalf.length > 0 ?
            (secondHalf.filter(d => d.was_correct === 1).length / secondHalf.length) * 100 : 0;
        const improvementRate = secondHalfAccuracy - firstHalfAccuracy;
        return {
            accuracy,
            confidence: averageConfidence,
            totalPredictions,
            correctPredictions,
            averageProcessingTime,
            improvementRate
        };
    }
    /**
     * Generate comprehensive performance report
     */
    async generatePerformanceReport(modelName, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Get categorization metrics
        const categorization = await this.getCategorizationMetrics(modelName, days);
        // Get caching metrics
        const cacheStats = this.aiRepo.getCacheStats();
        const avgCacheResponseTime = this.aiRepo.getAverageMetric(modelName, 'response_time', days) || 0;
        // Get learning metrics
        const feedbackData = this.aiRepo.getLearningDataForModel(modelName, 'user_correction');
        const recentFeedback = feedbackData.filter(d => new Date(d.created_at) >= startDate);
        const feedbackCount = recentFeedback.length;
        const correctionsApplied = recentFeedback.filter(d => d.user_correction).length;
        // Calculate accuracy improvement from corrections
        const accuracyBefore = this.aiRepo.getModelAccuracy(modelName, days * 2) || 0;
        const accuracyAfter = categorization.accuracy;
        const accuracyImprovement = accuracyAfter - accuracyBefore;
        // Generate recommendations
        const recommendations = this.generateRecommendations(categorization, cacheStats, {
            feedbackCount,
            correctionsApplied,
            accuracyImprovement
        });
        return {
            modelName,
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                days
            },
            categorization,
            caching: {
                hitRate: cacheStats.hitRate,
                totalQueries: cacheStats.totalEntries,
                cacheSize: cacheStats.totalEntries - cacheStats.expiredEntries,
                averageResponseTime: avgCacheResponseTime
            },
            learning: {
                feedbackCount,
                correctionsApplied,
                accuracyImprovement
            },
            recommendations
        };
    }
    /**
     * Get confidence trend over time
     */
    async getConfidenceTrend(modelName, days = 30) {
        const metrics = this.aiRepo.getMetricsForModel(modelName, 'performance');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const recentMetrics = metrics.filter(m => new Date(m.created_at) >= startDate &&
            m.metric_name === 'confidence');
        return recentMetrics.map(m => ({
            date: m.created_at,
            confidence: m.metric_value
        }));
    }
    /**
     * Get accuracy trend over time
     */
    async getAccuracyTrend(modelName, days = 30) {
        const learningData = this.aiRepo.getLearningDataForModel(modelName, 'categorization');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const recentData = learningData.filter(d => new Date(d.created_at) >= startDate);
        // Group by day and calculate daily accuracy
        const dailyAccuracy = {};
        recentData.forEach(d => {
            const date = d.created_at.split('T')[0]; // Get date part
            if (!dailyAccuracy[date]) {
                dailyAccuracy[date] = { correct: 0, total: 0 };
            }
            dailyAccuracy[date].total++;
            if (d.was_correct === 1) {
                dailyAccuracy[date].correct++;
            }
        });
        return Object.entries(dailyAccuracy).map(([date, stats]) => ({
            date,
            accuracy: (stats.correct / stats.total) * 100
        }));
    }
    /**
     * Clean up old metrics and learning data
     */
    async cleanup(olderThanDays = 90) {
        // This would require additional methods in AIRepository to delete old data
        // For now, we'll just clean expired cache
        const expiredDeleted = this.aiRepo.clearExpiredCache();
        return {
            metricsDeleted: 0, // Would implement this
            learningDataDeleted: expiredDeleted
        };
    }
    async updateCategorizationMetrics(modelName) {
        const accuracy = this.aiRepo.getModelAccuracy(modelName, 7) || 0; // Weekly accuracy
        await this.aiRepo.storeMetric({
            model_name: modelName,
            metric_type: 'categorization',
            metric_name: 'weekly_accuracy',
            metric_value: accuracy
        });
    }
    generateRecommendations(categorization, cacheStats, learning) {
        const recommendations = [];
        // Accuracy recommendations
        if (categorization.accuracy < 70) {
            recommendations.push("Low accuracy detected. Consider increasing training data or adjusting model parameters.");
        }
        else if (categorization.accuracy > 95) {
            recommendations.push("Excellent accuracy! Consider this model ready for production use.");
        }
        // Confidence recommendations
        if (categorization.confidence < 0.7) {
            recommendations.push("Low confidence scores suggest the model needs more diverse training examples.");
        }
        // Processing time recommendations
        if (categorization.averageProcessingTime > 1000) {
            recommendations.push("High processing times detected. Consider optimizing model or enabling caching.");
        }
        // Caching recommendations
        if (cacheStats.hitRate < 30) {
            recommendations.push("Low cache hit rate. Consider adjusting cache TTL or improving cache key strategy.");
        }
        else if (cacheStats.hitRate > 80) {
            recommendations.push("Excellent cache performance! Current caching strategy is working well.");
        }
        // Learning recommendations
        if (learning.feedbackCount > 0 && learning.accuracyImprovement < 0) {
            recommendations.push("Despite user feedback, accuracy isn't improving. Review feedback integration process.");
        }
        else if (learning.accuracyImprovement > 5) {
            recommendations.push("Great accuracy improvement! User feedback integration is working effectively.");
        }
        // Improvement rate recommendations
        if (categorization.improvementRate < -5) {
            recommendations.push("Model performance is declining over time. Consider retraining or model refresh.");
        }
        else if (categorization.improvementRate > 5) {
            recommendations.push("Model is continuously improving! Current learning strategy is effective.");
        }
        return recommendations.length > 0 ? recommendations : ["Model performance is stable. Continue monitoring."];
    }
}
exports.AIMetricsService = AIMetricsService;
//# sourceMappingURL=AIMetricsService.js.map