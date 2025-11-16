"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRepository = void 0;
const DatabaseConnection_1 = require("../database/DatabaseConnection");
class AIRepository {
    constructor() {
        // Lazy initialization - get DB instance when methods are called
        try {
            this.db = DatabaseConnection_1.DatabaseConnection.getInstance();
        }
        catch (error) {
            // DB not initialized yet, will be set later
            this.db = null;
        }
    }
    getDb() {
        if (!this.db) {
            this.db = DatabaseConnection_1.DatabaseConnection.getInstance();
        }
        return this.db;
    }
    // === AI Models Management ===
    registerModel(model) {
        const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO ai_models (
        model_name, model_type, model_version, file_path, file_size,
        model_config, load_count, last_loaded, memory_usage, 
        performance_metrics, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(model.model_name, model.model_type, model.model_version, model.file_path || null, model.file_size || null, model.model_config || null, model.load_count, model.last_loaded || null, model.memory_usage || null, model.performance_metrics || null, model.is_active);
        return this.getModelById(result.lastInsertRowid);
    }
    updateModelLoad(modelName, memoryUsage) {
        const stmt = this.getDb().prepare(`
      UPDATE ai_models 
      SET load_count = load_count + 1,
          last_loaded = CURRENT_TIMESTAMP,
          memory_usage = COALESCE(?, memory_usage),
          updated_at = CURRENT_TIMESTAMP
      WHERE model_name = ?
    `);
        stmt.run(memoryUsage || null, modelName);
    }
    getModelByName(modelName) {
        const stmt = this.getDb().prepare('SELECT * FROM ai_models WHERE model_name = ?');
        return stmt.get(modelName) || null;
    }
    getModelById(id) {
        const stmt = this.getDb().prepare('SELECT * FROM ai_models WHERE model_id = ?');
        return stmt.get(id) || null;
    }
    getAllModels() {
        const stmt = this.getDb().prepare('SELECT * FROM ai_models ORDER BY created_at DESC');
        return stmt.all();
    }
    // === Prediction Caching ===
    getCachedPrediction(inputHash) {
        const stmt = this.getDb().prepare(`
      SELECT * FROM ai_prediction_cache 
      WHERE input_hash = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `);
        const cached = stmt.get(inputHash) || null;
        if (cached) {
            // Update hit count and last accessed
            this.updateCacheAccess(inputHash);
        }
        return cached;
    }
    storePrediction(cache) {
        const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO ai_prediction_cache (
        input_hash, model_name, input_data, prediction_result, 
        confidence_score, hit_count, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(cache.input_hash, cache.model_name, cache.input_data, cache.prediction_result, cache.confidence_score || null, cache.hit_count, cache.expires_at || null);
    }
    updateCacheAccess(inputHash) {
        const stmt = this.getDb().prepare(`
      UPDATE ai_prediction_cache 
      SET hit_count = hit_count + 1, last_accessed = CURRENT_TIMESTAMP 
      WHERE input_hash = ?
    `);
        stmt.run(inputHash);
    }
    clearExpiredCache() {
        const stmt = this.getDb().prepare(`
      DELETE FROM ai_prediction_cache 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `);
        return stmt.run().changes;
    }
    // === Learning Data Management ===
    storeLearningData(data) {
        const stmt = this.getDb().prepare(`
      INSERT INTO ai_learning_data (
        model_name, input_data, expected_output, actual_output,
        feedback_type, confidence_score, was_correct, user_correction,
        transaction_id, category_id, payee_id, processing_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(data.model_name, data.input_data, data.expected_output, data.actual_output || null, data.feedback_type, data.confidence_score || null, data.was_correct, data.user_correction || null, data.transaction_id || null, data.category_id || null, data.payee_id || null, data.processing_time || null);
        return this.getLearningDataById(result.lastInsertRowid);
    }
    getLearningDataById(id) {
        const stmt = this.getDb().prepare('SELECT * FROM ai_learning_data WHERE learning_id = ?');
        return stmt.get(id) || null;
    }
    getLearningDataForModel(modelName, feedbackType) {
        let query = 'SELECT * FROM ai_learning_data WHERE model_name = ?';
        const params = [modelName];
        if (feedbackType) {
            query += ' AND feedback_type = ?';
            params.push(feedbackType);
        }
        query += ' ORDER BY created_at DESC';
        const stmt = this.getDb().prepare(query);
        return stmt.all(...params);
    }
    getCorrectionsForImprovement(modelName, limit = 50) {
        const stmt = this.getDb().prepare(`
      SELECT * FROM ai_learning_data 
      WHERE model_name = ? AND was_correct = 0 AND user_correction IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ?
    `);
        return stmt.all(modelName, limit);
    }
    // === Performance Metrics ===
    storeMetric(metric) {
        const stmt = this.getDb().prepare(`
      INSERT INTO ai_performance_metrics (
        model_name, metric_type, metric_name, metric_value,
        metric_data, measurement_period_start, measurement_period_end, sample_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(metric.model_name, metric.metric_type, metric.metric_name, metric.metric_value, metric.metric_data || null, metric.measurement_period_start || null, metric.measurement_period_end || null, metric.sample_size || null);
        return this.getMetricById(result.lastInsertRowid);
    }
    getMetricById(id) {
        const stmt = this.getDb().prepare('SELECT * FROM ai_performance_metrics WHERE metric_id = ?');
        return stmt.get(id) || null;
    }
    getMetricsForModel(modelName, metricType, startDate, endDate) {
        let query = 'SELECT * FROM ai_performance_metrics WHERE model_name = ?';
        const params = [modelName];
        if (metricType) {
            query += ' AND metric_type = ?';
            params.push(metricType);
        }
        if (startDate) {
            query += ' AND created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND created_at <= ?';
            params.push(endDate);
        }
        query += ' ORDER BY created_at DESC';
        const stmt = this.getDb().prepare(query);
        return stmt.all(...params);
    }
    getAverageMetric(modelName, metricName, days = 7) {
        const stmt = this.getDb().prepare(`
      SELECT AVG(metric_value) as average
      FROM ai_performance_metrics 
      WHERE model_name = ? AND metric_name = ? 
        AND created_at >= datetime('now', '-' || ? || ' days')
    `);
        const result = stmt.get(modelName, metricName, days);
        return result?.average || null;
    }
    // === Utility Methods ===
    getCacheStats() {
        const totalStmt = this.getDb().prepare('SELECT COUNT(*) as count FROM ai_prediction_cache');
        const expiredStmt = this.getDb().prepare(`
      SELECT COUNT(*) as count FROM ai_prediction_cache 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `);
        const hitStmt = this.getDb().prepare('SELECT AVG(hit_count) as avgHits FROM ai_prediction_cache');
        const total = totalStmt.get().count;
        const expired = expiredStmt.get().count;
        const avgHits = hitStmt.get().avgHits || 0;
        return {
            totalEntries: total,
            hitRate: avgHits > 1 ? ((avgHits - 1) / avgHits) * 100 : 0,
            expiredEntries: expired
        };
    }
    getModelAccuracy(modelName, days = 30) {
        const stmt = this.getDb().prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(was_correct) as correct
      FROM ai_learning_data 
      WHERE model_name = ? 
        AND created_at >= datetime('now', '-' || ? || ' days')
        AND feedback_type = 'categorization'
    `);
        const result = stmt.get(modelName, days);
        if (!result || result.total === 0)
            return null;
        return (result.correct / result.total) * 100;
    }
}
exports.AIRepository = AIRepository;
//# sourceMappingURL=AIRepository.js.map