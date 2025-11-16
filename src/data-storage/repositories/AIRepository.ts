import { DatabaseConnection } from '../database/DatabaseConnection';

export interface AIModel {
  model_id?: number;
  model_name: string;
  model_type: string;
  model_version: string;
  file_path?: string;
  file_size?: number;
  model_config?: string;
  load_count: number;
  last_loaded?: string;
  memory_usage?: number;
  performance_metrics?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface AILearningData {
  learning_id?: number;
  model_name: string;
  input_data: string;
  expected_output: string;
  actual_output?: string;
  feedback_type: string;
  confidence_score?: number;
  was_correct: number;
  user_correction?: string;
  transaction_id?: number;
  category_id?: number;
  payee_id?: number;
  processing_time?: number;
  created_at?: string;
}

export interface AIPredictionCache {
  cache_id?: number;
  input_hash: string;
  model_name: string;
  input_data: string;
  prediction_result: string;
  confidence_score?: number;
  hit_count: number;
  last_accessed?: string;
  expires_at?: string;
  created_at?: string;
}

export interface AIPerformanceMetric {
  metric_id?: number;
  model_name: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metric_data?: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  sample_size?: number;
  created_at?: string;
}

export class AIRepository {
  private db: any;

  constructor() {
    // Lazy initialization - get DB instance when methods are called
    try {
      this.db = DatabaseConnection.getInstance();
    } catch (error) {
      // DB not initialized yet, will be set later
      this.db = null;
    }
  }

  private getDb() {
    if (!this.db) {
      this.db = DatabaseConnection.getInstance();
    }
    return this.db;
  }

  // === AI Models Management ===
  
  registerModel(model: Omit<AIModel, 'model_id' | 'created_at' | 'updated_at'>): AIModel {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO ai_models (
        model_name, model_type, model_version, file_path, file_size,
        model_config, load_count, last_loaded, memory_usage, 
        performance_metrics, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      model.model_name,
      model.model_type,
      model.model_version,
      model.file_path || null,
      model.file_size || null,
      model.model_config || null,
      model.load_count,
      model.last_loaded || null,
      model.memory_usage || null,
      model.performance_metrics || null,
      model.is_active
    );
    
    return this.getModelById(result.lastInsertRowid as number)!;
  }

  updateModelLoad(modelName: string, memoryUsage?: number): void {
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

  getModelByName(modelName: string): AIModel | null {
    const stmt = this.getDb().prepare('SELECT * FROM ai_models WHERE model_name = ?');
    return stmt.get(modelName) as AIModel || null;
  }

  private getModelById(id: number): AIModel | null {
    const stmt = this.getDb().prepare('SELECT * FROM ai_models WHERE model_id = ?');
    return stmt.get(id) as AIModel || null;
  }

  getAllModels(): AIModel[] {
    const stmt = this.getDb().prepare('SELECT * FROM ai_models ORDER BY created_at DESC');
    return stmt.all() as AIModel[];
  }

  // === Prediction Caching ===
  
  getCachedPrediction(inputHash: string): AIPredictionCache | null {
    const stmt = this.getDb().prepare(`
      SELECT * FROM ai_prediction_cache 
      WHERE input_hash = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `);
    
    const cached = stmt.get(inputHash) as AIPredictionCache || null;
    
    if (cached) {
      // Update hit count and last accessed
      this.updateCacheAccess(inputHash);
    }
    
    return cached;
  }

  storePrediction(cache: Omit<AIPredictionCache, 'cache_id' | 'created_at' | 'last_accessed'>): void {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO ai_prediction_cache (
        input_hash, model_name, input_data, prediction_result, 
        confidence_score, hit_count, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      cache.input_hash,
      cache.model_name,
      cache.input_data,
      cache.prediction_result,
      cache.confidence_score || null,
      cache.hit_count,
      cache.expires_at || null
    );
  }

  private updateCacheAccess(inputHash: string): void {
    const stmt = this.getDb().prepare(`
      UPDATE ai_prediction_cache 
      SET hit_count = hit_count + 1, last_accessed = CURRENT_TIMESTAMP 
      WHERE input_hash = ?
    `);
    
    stmt.run(inputHash);
  }

  clearExpiredCache(): number {
    const stmt = this.getDb().prepare(`
      DELETE FROM ai_prediction_cache 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `);
    
    return stmt.run().changes;
  }

  // === Learning Data Management ===
  
  storeLearningData(data: Omit<AILearningData, 'learning_id' | 'created_at'>): AILearningData {
    const stmt = this.getDb().prepare(`
      INSERT INTO ai_learning_data (
        model_name, input_data, expected_output, actual_output,
        feedback_type, confidence_score, was_correct, user_correction,
        transaction_id, category_id, payee_id, processing_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.model_name,
      data.input_data,
      data.expected_output,
      data.actual_output || null,
      data.feedback_type,
      data.confidence_score || null,
      data.was_correct,
      data.user_correction || null,
      data.transaction_id || null,
      data.category_id || null,
      data.payee_id || null,
      data.processing_time || null
    );
    
    return this.getLearningDataById(result.lastInsertRowid as number)!;
  }

  private getLearningDataById(id: number): AILearningData | null {
    const stmt = this.getDb().prepare('SELECT * FROM ai_learning_data WHERE learning_id = ?');
    return stmt.get(id) as AILearningData || null;
  }

  getLearningDataForModel(modelName: string, feedbackType?: string): AILearningData[] {
    let query = 'SELECT * FROM ai_learning_data WHERE model_name = ?';
    const params: any[] = [modelName];
    
    if (feedbackType) {
      query += ' AND feedback_type = ?';
      params.push(feedbackType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = this.getDb().prepare(query);
    return stmt.all(...params) as AILearningData[];
  }

  getCorrectionsForImprovement(modelName: string, limit = 50): AILearningData[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM ai_learning_data 
      WHERE model_name = ? AND was_correct = 0 AND user_correction IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(modelName, limit) as AILearningData[];
  }

  // === Performance Metrics ===
  
  storeMetric(metric: Omit<AIPerformanceMetric, 'metric_id' | 'created_at'>): AIPerformanceMetric {
    const stmt = this.getDb().prepare(`
      INSERT INTO ai_performance_metrics (
        model_name, metric_type, metric_name, metric_value,
        metric_data, measurement_period_start, measurement_period_end, sample_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      metric.model_name,
      metric.metric_type,
      metric.metric_name,
      metric.metric_value,
      metric.metric_data || null,
      metric.measurement_period_start || null,
      metric.measurement_period_end || null,
      metric.sample_size || null
    );
    
    return this.getMetricById(result.lastInsertRowid as number)!;
  }

  private getMetricById(id: number): AIPerformanceMetric | null {
    const stmt = this.getDb().prepare('SELECT * FROM ai_performance_metrics WHERE metric_id = ?');
    return stmt.get(id) as AIPerformanceMetric || null;
  }

  getMetricsForModel(
    modelName: string, 
    metricType?: string, 
    startDate?: string, 
    endDate?: string
  ): AIPerformanceMetric[] {
    let query = 'SELECT * FROM ai_performance_metrics WHERE model_name = ?';
    const params: any[] = [modelName];
    
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
    return stmt.all(...params) as AIPerformanceMetric[];
  }

  getAverageMetric(modelName: string, metricName: string, days = 7): number | null {
    const stmt = this.getDb().prepare(`
      SELECT AVG(metric_value) as average
      FROM ai_performance_metrics 
      WHERE model_name = ? AND metric_name = ? 
        AND created_at >= datetime('now', '-' || ? || ' days')
    `);
    
    const result = stmt.get(modelName, metricName, days) as { average: number } | undefined;
    return result?.average || null;
  }

  // === Utility Methods ===
  
  getCacheStats(): { totalEntries: number; hitRate: number; expiredEntries: number } {
    const totalStmt = this.getDb().prepare('SELECT COUNT(*) as count FROM ai_prediction_cache');
    const expiredStmt = this.getDb().prepare(`
      SELECT COUNT(*) as count FROM ai_prediction_cache 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `);
    const hitStmt = this.getDb().prepare('SELECT AVG(hit_count) as avgHits FROM ai_prediction_cache');
    
    const total = (totalStmt.get() as { count: number }).count;
    const expired = (expiredStmt.get() as { count: number }).count;
    const avgHits = (hitStmt.get() as { avgHits: number }).avgHits || 0;
    
    return {
      totalEntries: total,
      hitRate: avgHits > 1 ? ((avgHits - 1) / avgHits) * 100 : 0,
      expiredEntries: expired
    };
  }

  getModelAccuracy(modelName: string, days = 30): number | null {
    const stmt = this.getDb().prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(was_correct) as correct
      FROM ai_learning_data 
      WHERE model_name = ? 
        AND created_at >= datetime('now', '-' || ? || ' days')
        AND feedback_type = 'categorization'
    `);
    
    const result = stmt.get(modelName, days) as { total: number; correct: number } | undefined;
    
    if (!result || result.total === 0) return null;
    
    return (result.correct / result.total) * 100;
  }
}