import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { TransactionCategorizationService, CategorizationResult } from '../../src/data-processing/ai/TransactionCategorizationService';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { Category } from '../../src/data-storage/models/Category';
import { Payee } from '../../src/data-storage/models/Payee';
import { fingerprintDescription } from '../../src/data-processing/ai/FingerprintUtil';

// Global AI service instance
let categorizationService: TransactionCategorizationService | null = null;
let dbInstance: any = null;
let trainingCorpusPath: string | null = null;

interface CategorizationRule {
  rule_id?: number;
  match_string: string;
  match_type: 'CONTAINS' | 'EXACT_MATCH';
  match_amount?: number | null;
  target_category_id: number;
  active: number;
}

interface TrainingPrior {
  category_id: number | null;
  category_name: string | null;
  support: number;
}

// Initialize AI services with database instance
const initializeAIServices = async (db?: any) => {
  // Store database instance if provided
  if (db) {
    dbInstance = db;
  } else if (!dbInstance) {
    try {
      const { DatabaseConnection } = require('../../src/data-storage/database/DatabaseConnection');
      dbInstance = DatabaseConnection.getInstance();
    } catch (err) {
      console.error('Unable to attach database instance for AI services:', err);
    }
  }

  // Initialize rule-based categorization service
  if (!categorizationService) {
    categorizationService = new TransactionCategorizationService();
    console.log('Rule-based categorization service initialized (Phase 1)');
  }

  // Initialize learning table for feedback-based improvements (Phase 2)
  if (dbInstance) {
    try {
      dbInstance.prepare(`
        CREATE TABLE IF NOT EXISTS ai_categorization_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER,
          payee_id INTEGER,
          payee_name TEXT,
          category_id INTEGER,
          category_name TEXT,
          description TEXT,
          amount REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      dbInstance.prepare(`
        CREATE TABLE IF NOT EXISTS ai_training_corpus (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fingerprint TEXT,
          raw_description TEXT,
          amount REAL,
          transaction_type TEXT,
          category_id INTEGER,
          category_name TEXT,
          payee_id INTEGER,
          payee_name TEXT,
          source TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      dbInstance.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ai_training_corpus_fingerprint
          ON ai_training_corpus (fingerprint)
      `).run();

      dbInstance.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ai_training_corpus_category
          ON ai_training_corpus (category_id, category_name)
      `).run();

      // Try to resolve the labeled CSV path once
      const candidatePath = path.join(process.cwd(), 'docs', 'labeled_transactions_wf_checking_2025-09.csv');
      if (fs.existsSync(candidatePath)) {
        trainingCorpusPath = candidatePath;
      }

      // Seed training table from CSV if available and not already populated
      if (trainingCorpusPath) {
        seedTrainingCorpusFromCSV(trainingCorpusPath);
      }
    } catch (error) {
      console.error('Failed to initialize ai_categorization_feedback table:', error);
    }
  }
};

// Helper function to ensure database is ready
const ensureDatabaseReady = (): boolean => {
  if (!dbInstance) {
    console.error('Database instance not provided to AI handlers');
    return false;
  }
  return true;
};

// Seed the local training table from a labeled CSV (one-time best effort)
const seedTrainingCorpusFromCSV = (csvPath: string) => {
  try {
    const rowCount = dbInstance
      .prepare('SELECT COUNT(*) as cnt FROM ai_training_corpus')
      .get()?.cnt as number;

    if (rowCount > 0) {
      return; // already seeded
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return;

    const header = lines[0].split(',');
    const idx = {
      description_raw: header.indexOf('description_raw'),
      amount: header.indexOf('amount'),
      transaction_type_label: header.indexOf('transaction_type_label'),
      payee_label: header.indexOf('payee_label'),
      category_name_label: header.indexOf('category_name_label')
    };

    const insertStmt = dbInstance.prepare(`
      INSERT INTO ai_training_corpus (
        fingerprint, raw_description, amount, transaction_type, category_id, category_name, payee_name, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV split with quote handling
      const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!cells || cells.length < header.length) continue;

      const rawDescription = cells[idx.description_raw] ?? '';
      const amount = Number(cells[idx.amount] ?? 0);
      const txnType = cells[idx.transaction_type_label] ?? '';
      const payee = cells[idx.payee_label] ?? '';
      const categoryName = cells[idx.category_name_label] ?? '';
      const fp = fingerprintDescription(rawDescription);

      insertStmt.run(fp, rawDescription, amount, txnType, null, categoryName, payee, 'seed_csv');
      inserted++;
    }

    console.log(`Seeded training corpus from CSV (${inserted} rows)`);
  } catch (error) {
    console.error('Error seeding training corpus from CSV:', error);
  }
};

// Look up majority category by fingerprint from training corpus + feedback
const getTrainingPriorForFingerprint = (fingerprint: string): TrainingPrior | null => {
  if (!fingerprint || !dbInstance) return null;

  try {
    const row = dbInstance.prepare(
      `
        SELECT category_id, category_name, COUNT(*) as cnt
        FROM ai_training_corpus
        WHERE fingerprint = ?
        GROUP BY category_id, category_name
        ORDER BY cnt DESC
        LIMIT 1
      `
    ).get(fingerprint);

    if (row && row.cnt >= 2) {
      return {
        category_id: row.category_id ?? null,
        category_name: row.category_name ?? null,
        support: row.cnt
      };
    }
  } catch (error) {
    console.error('Error reading training prior:', error);
  }

  return null;
};

// Insert a confirmed example into the training corpus
const recordTrainingExample = (params: {
  fingerprint: string;
  raw_description?: string | null;
  amount?: number | null;
  transaction_type?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  payee_id?: number | null;
  payee_name?: string | null;
  source: string;
}) => {
  if (!dbInstance || !params.fingerprint) return;
  try {
    dbInstance.prepare(
      `
        INSERT INTO ai_training_corpus (
          fingerprint, raw_description, amount, transaction_type,
          category_id, category_name, payee_id, payee_name, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      params.fingerprint,
      params.raw_description ?? null,
      params.amount ?? null,
      params.transaction_type ?? null,
      params.category_id ?? null,
      params.category_name ?? null,
      params.payee_id ?? null,
      params.payee_name ?? null,
      params.source
    );
  } catch (error) {
    console.error('Error recording training example:', error);
  }
};

// Apply training prior to the predictions (in-memory augmentation)
const applyTrainingPrior = (
  transaction: Transaction,
  predictions: any[],
  availableCategories: Category[]
) => {
  const fp = fingerprintDescription(transaction.description || '');
  const prior = getTrainingPriorForFingerprint(fp);

  if (!prior || !prior.category_name) return { predictions, rationale: null };

  const match = availableCategories.find(
    (c) =>
      c.category_id === prior.category_id ||
      (c.name &&
        prior.category_name &&
        c.name.toLowerCase() === prior.category_name.toLowerCase())
  );

  if (!match) return { predictions, rationale: null };

  const boosted = {
    category: match,
    confidence: 0.93,
    rationale: `Training prior (${prior.support} samples)`
  };

  // Deduplicate keeping highest confidence
  const filtered = predictions.filter(
    (p) => p.category.category_id !== match.category_id
  );

  return {
    predictions: [boosted, ...filtered].sort((a, b) => b.confidence - a.confidence).slice(0, 3),
    rationale: boosted.rationale
  };
};

// Load all active categorization rules
const getActiveCategorizationRules = (): CategorizationRule[] => {
  if (!dbInstance) return [];
  try {
    const rows = dbInstance.prepare(`
      SELECT rule_id, match_string, match_type, match_amount, target_category_id, active
      FROM categorization_rules
      WHERE active = 1
    `).all();
    return rows as CategorizationRule[];
  } catch (error) {
    console.error('Error loading categorization rules:', error);
    return [];
  }
};

// Apply rules to a single transaction, returns a matching rule if found
const findMatchingRuleForTransaction = (
  tx: Transaction,
  rules: CategorizationRule[]
): CategorizationRule | null => {
  if (!tx || !tx.description) return null;

  const description = (tx.description || '').toString();
  const amount = tx.amount;

  const normalize = (s: string) => s.toUpperCase();

  const specificRules = rules.filter(r => r.match_amount !== null && r.match_amount !== undefined);
  const generalRules = rules.filter(r => r.match_amount === null || r.match_amount === undefined);

  // Helper: does rule match description and amount?
  const matches = (rule: CategorizationRule): boolean => {
    if (!rule.match_string) return false;
    const pattern = normalize(rule.match_string);
    const haystack = normalize(description);

    let descMatch = false;
    if (rule.match_type === 'EXACT_MATCH') {
      descMatch = haystack === pattern;
    } else {
      descMatch = haystack.includes(pattern);
    }

    if (!descMatch) return false;

    if (rule.match_amount !== null && rule.match_amount !== undefined) {
      return amount === rule.match_amount;
    }

    return true;
  };

  // 1. Specific rules: match_string + amount
  for (const rule of specificRules) {
    if (matches(rule)) {
      return rule;
    }
  }

  // 2. General rules: match_string only
  for (const rule of generalRules) {
    if (matches(rule)) {
      return rule;
    }
  }

  return null;
};

// AI Status
ipcMain.handle('ai:getStatus', async () => {
  try {
    await initializeAIServices();

    return {
      status: 'ready',
      message: 'Rule-based categorization service is ready (Phase 1)',
      features: {
        categorization: true,
        payeeExtraction: true,
        learning: false, // Phase 2+
        ruleBased: true,
        lightweight: true
      },
      accuracy: {
        target: '75-80%',
        description: 'Rule-based pattern matching with confidence scoring'
      }
    };
  } catch (error) {
    console.error('AI service initialization error:', error);
    return {
      status: 'error',
      message: 'Failed to initialize AI services',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Transaction Categorization with Payee Extraction
ipcMain.handle('ai:categorizeTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Check if database is ready
    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories and payees directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();

    // Apply user-defined categorization rules first
    const rules = getActiveCategorizationRules();
    const matchedRule = findMatchingRuleForTransaction(transaction, rules);

    let result: CategorizationResult;
    let trainingRationale: string | null = null;

    if (matchedRule) {
      const ruleCategory = (availableCategories as Category[]).find(
        c => c.category_id === matchedRule.target_category_id
      );

      if (ruleCategory) {
        result = {
          categoryPredictions: [{
            category: ruleCategory,
            confidence: 0.99
          }],
          payeeExtraction: null,
          extractedInfo: {},
          confidence: 0.99
        };
      } else {
        result = await categorizationService.processTransaction(
          transaction,
          availableCategories,
          existingPayees
        );
      }
    } else {
      result = await categorizationService.processTransaction(
        transaction,
        availableCategories,
        existingPayees
      );
    }

    // Apply learned category override if strong feedback exists for this payee
    const payeeId = (transaction as any).payee_id as number | undefined;
    const payeeName = (transaction as any).payee_name as string | undefined;
    const learned = getLearnedCategoryForPayee(payeeId, payeeName);

    if (learned) {
      const learnedCategory = availableCategories.find(
        (c: Category) => c.category_id === learned.category_id
      );

      if (learnedCategory) {
        const learnedPrediction = {
          category: learnedCategory,
          confidence: 0.9
        };

        const remainingPredictions = result.categoryPredictions.filter(
          p => p.category.category_id !== learnedCategory.category_id
        );

        result.categoryPredictions = [learnedPrediction, ...remainingPredictions];
      }
    }

    // Apply training prior (CSV + feedback) as a high-confidence hint
    const withPrior = applyTrainingPrior(transaction, result.categoryPredictions, availableCategories);
    result.categoryPredictions = withPrior.predictions;
    trainingRationale = withPrior.rationale;

    // Record this auto decision as a weak training example for future weighting
    if (result.categoryPredictions.length > 0) {
      recordTrainingExample({
        fingerprint: fingerprintDescription(transaction.description || ''),
        raw_description: transaction.description,
        amount: transaction.amount,
        transaction_type: (transaction as any).transaction_type,
        category_id: result.categoryPredictions[0].category.category_id,
        category_name: result.categoryPredictions[0].category.name,
        payee_id: payeeId || null,
        payee_name: payeeName || (result.payeeExtraction?.payee?.name ?? null),
        source: trainingRationale ? 'training_prior' : 'ai_prediction'
      });
    }

    return {
      success: true,
      predictions: result.categoryPredictions,
      payeeExtraction: result.payeeExtraction,
      extractedInfo: result.extractedInfo,
      confidence: result.confidence,
      rationale: trainingRationale
    };
  } catch (error) {
    console.error('Error categorizing transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Batch Transaction Categorization
ipcMain.handle('ai:batchCategorizeTransactions', async (event, transactions: Transaction[]) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Check if database is ready
    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories, payees, and rules directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();
    const rules = getActiveCategorizationRules();
    console.log(`Using ${availableCategories.length} categories, ${existingPayees.length} payees, ${rules.length} rules`);

    console.log(`Starting batch categorization of ${transactions.length} transactions`);

    const results = await categorizationService.batchProcessTransactions(
      transactions,
      availableCategories,
      existingPayees,
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('ai:categorization-progress', progress);
        console.log(`Batch categorization progress: ${progress.toFixed(1)}%`);
      }
    );

    // Convert Map to Object for IPC transmission, applying rules and learning overrides
    const resultObj: { [key: number]: any } = {};
    results.forEach((result, transactionId) => {
      const tx = transactions.find(t => t.transaction_id === transactionId);

      if (tx) {
        // Apply user-defined rules first
        const rule = findMatchingRuleForTransaction(tx, rules);
        if (rule) {
          const ruleCategory = (availableCategories as Category[]).find(
            (c: Category) => c.category_id === rule.target_category_id
          );
          if (ruleCategory) {
            const rulePrediction = {
              category: ruleCategory,
              confidence: 0.99
            };

            const remainingPredictions = result.categoryPredictions.filter(
              p => p.category.category_id !== ruleCategory.category_id
            );

            result.categoryPredictions = [rulePrediction, ...remainingPredictions];
          }
        }

        const payeeId = (tx as any).payee_id as number | undefined;
        const payeeName = (tx as any).payee_name as string | undefined;
        const learned = getLearnedCategoryForPayee(payeeId, payeeName);

        if (learned) {
          const learnedCategory = availableCategories.find(
            (c: Category) => c.category_id === learned.category_id
          );

          if (learnedCategory) {
            const learnedPrediction = {
              category: learnedCategory,
              confidence: 0.9
            };

            const remainingPredictions = result.categoryPredictions.filter(
              p => p.category.category_id !== learnedCategory.category_id
            );

            result.categoryPredictions = [learnedPrediction, ...remainingPredictions];
          }
        }

        const withPrior = applyTrainingPrior(tx, result.categoryPredictions, availableCategories);
        result.categoryPredictions = withPrior.predictions;

        let rationale: string | null = withPrior.rationale || (rule ? 'Rule match' : null) || (learned ? 'Learned from feedback' : null);

        if (result.categoryPredictions.length > 0) {
          recordTrainingExample({
            fingerprint: fingerprintDescription(tx.description || ''),
            raw_description: tx.description,
            amount: tx.amount,
            transaction_type: (tx as any).transaction_type,
            category_id: result.categoryPredictions[0].category.category_id,
            category_name: result.categoryPredictions[0].category.name,
            payee_id: payeeId || null,
            payee_name: payeeName || (result.payeeExtraction?.payee?.name ?? null),
            source: withPrior.rationale ? 'training_prior' : 'ai_prediction'
          });
        }

        resultObj[transactionId] = {
          categoryPredictions: result.categoryPredictions,
          payeeExtraction: result.payeeExtraction,
          extractedInfo: result.extractedInfo,
          confidence: result.confidence,
          rationale
        };
      } else {
        resultObj[transactionId] = {
          categoryPredictions: result.categoryPredictions,
          payeeExtraction: result.payeeExtraction,
          extractedInfo: result.extractedInfo,
          confidence: result.confidence
        };
      }
    });

    console.log(`Batch categorization completed: ${results.size} transactions processed`);

    return {
      success: true,
      results: resultObj
    };
  } catch (error) {
    console.error('Error in batch categorization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Helper: get dominant learned category for a payee
const getLearnedCategoryForPayee = (payeeId?: number | null, payeeName?: string | null): { category_id: number; category_name: string } | null => {
  if (!dbInstance) return null;

  try {
    if (payeeId) {
      const row = dbInstance.prepare(`
        SELECT category_id, category_name, COUNT(*) as count
        FROM ai_categorization_feedback
        WHERE payee_id = ?
        GROUP BY category_id, category_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `).get(payeeId);

      if (row && row.category_id) {
        return { category_id: row.category_id, category_name: row.category_name };
      }
    }

    const normalizedName = (payeeName || '').trim().toLowerCase();
    if (normalizedName.length === 0) return null;

    const rowByName = dbInstance.prepare(`
      SELECT category_id, category_name, COUNT(*) as count
      FROM ai_categorization_feedback
      WHERE LOWER(payee_name) = ?
      GROUP BY category_id, category_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `).get(normalizedName);

    if (rowByName && rowByName.category_id) {
      return { category_id: rowByName.category_id, category_name: rowByName.category_name };
    }
  } catch (error) {
    console.error('Error reading learned category for payee:', error);
  }

  return null;
};

// Learn from User Feedback (Phase 2: persistent learning)
ipcMain.handle('ai:learnFromFeedback', async (event, feedback: any) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Log feedback for future learning (Phase 2)
    console.log('User feedback received:', feedback);

    // If feedback includes transaction and correct category, persist it
    if (feedback.transaction && feedback.correctCategory) {
      try {
        if (dbInstance) {
          const tx = feedback.transaction as Transaction;
          const cat = feedback.correctCategory as Category;
          const payee = feedback.correctPayee as Payee | undefined;

          dbInstance.prepare(`
            INSERT INTO ai_categorization_feedback (
              transaction_id,
              payee_id,
              payee_name,
              category_id,
              category_name,
              description,
              amount
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            tx.transaction_id || null,
            payee?.payee_id || null,
            payee?.name || tx.payee_name || null,
            cat.category_id || null,
            cat.name || null,
            tx.description || null,
            tx.amount || null
          );

          // Also record into training corpus for stronger priors
          recordTrainingExample({
            fingerprint: fingerprintDescription(tx.description || ''),
            raw_description: tx.description,
            amount: tx.amount,
            transaction_type: (tx as any).transaction_type,
            category_id: cat.category_id || null,
            category_name: cat.name || null,
            payee_id: payee?.payee_id || null,
            payee_name: payee?.name || tx.payee_name || null,
            source: 'user_feedback'
          });
        }
      } catch (dbError) {
        console.error('Error writing feedback to ai_categorization_feedback:', dbError);
      }

      // Preserve existing hook for potential in-memory learning
      categorizationService.learnFromCorrection(
        feedback.transaction,
        feedback.correctCategory,
        feedback.correctPayee
      );
    }

    return {
      success: true,
      message: 'Feedback logged for future improvements (Phase 2: Learning mechanism)'
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Create a user-defined categorization rule and optionally apply to existing transactions
ipcMain.handle('ai:addCategorizationRule', async (event, payload: any) => {
  try {
    await initializeAIServices();

    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    const { transaction, categoryId, scope } = payload || {};
    if (!transaction || !categoryId) {
      throw new Error('Invalid rule payload');
    }

    const description: string = (transaction.description || '').toString();
    const amount: number = transaction.amount;

    // Derive basic merchant pattern from description (simple heuristic: use full description)
    const matchString = description.trim();
    const matchType: 'CONTAINS' | 'EXACT_MATCH' = 'CONTAINS';

    let matchAmount: number | null = null;
    if (scope === 'MERCHANT_AMOUNT') {
      matchAmount = amount;
    }

    const insertStmt = dbInstance.prepare(`
      INSERT INTO categorization_rules (
        match_string, match_type, match_amount, target_category_id, active
      ) VALUES (?, ?, ?, ?, 1)
    `);

    const info = insertStmt.run(
      matchString,
      matchType,
      matchAmount,
      categoryId
    );

    const ruleId = info.lastInsertRowid as number;

    // Apply rule to existing uncategorized transactions (to keep behavior conservative)
    let updatedCount = 0;
    try {
      const updateSql = `
        UPDATE transactions
        SET category_id = ?
        WHERE category_id IS NULL
          AND description LIKE ?
          ${matchAmount !== null ? 'AND amount = ?' : ''}
      `;

      const params: any[] = [categoryId, `%${matchString}%`];
      if (matchAmount !== null) {
        params.push(matchAmount);
      }

      const result = dbInstance.prepare(updateSql).run(...params);
      updatedCount = result.changes || 0;
    } catch (applyError) {
      console.error('Error applying categorization rule to existing transactions:', applyError);
    }

    return {
      success: true,
      ruleId,
      updatedCount
    };
  } catch (error) {
    console.error('Error creating categorization rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// AI Chat Interface (Phase 2+ feature)
ipcMain.handle('ai:chat', async (event, messages: any[]) => {
  try {
    await initializeAIServices();

    console.log('AI Chat requested (Phase 2+ feature)');

    return {
      success: false,
      response: 'Chat feature available in Phase 2+. Currently using rule-based categorization (Phase 1).',
      error: 'Feature not available in Phase 1'
    };
  } catch (error) {
    console.error('Error in AI chat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Natural Language Query Processing (Phase 2+ feature)
ipcMain.handle('ai:processQuery', async (event, query: string) => {
  try {
    await initializeAIServices();

    console.log('Query processing requested (Phase 2+ feature):', query);

    return {
      success: false,
      enhanced: false,
      result: {
        type: 'text',
        content: 'Natural language query processing available in Phase 2+. Currently using rule-based categorization (Phase 1).'
      },
      error: 'Feature not available in Phase 1'
    };
  } catch (error) {
    console.error('Error processing query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get Uncategorized Transactions
ipcMain.handle('ai:getUncategorizedTransactions', async () => {
  try {
    await initializeAIServices();

    if (!ensureDatabaseReady()) {
      return {
        success: false,
        error: 'Database not accessible',
        transactions: []
      };
    }

    const allTransactions = dbInstance.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
    `).all();

    const uncategorized = allTransactions.filter((t: any) => !t.category_id);

    console.log(`Found ${uncategorized.length} uncategorized transactions out of ${allTransactions.length} total`);

    return {
      success: true,
      transactions: uncategorized
    };
  } catch (error) {
    console.error('Error getting uncategorized transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transactions: []
    };
  }
});

// Get AI Statistics
ipcMain.handle('ai:getStatistics', async () => {
  try {
    await initializeAIServices();

    if (!ensureDatabaseReady()) {
      return {
        success: false,
        error: 'Database not accessible',
        stats: {
          total: 0,
          categorized: 0,
          uncategorized: 0,
          completionRate: 100,
          lastUpdated: new Date().toISOString()
        }
      };
    }

    const allTransactions = dbInstance.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
    `).all();

    const categorized = allTransactions.filter((t: any) => t.category_id);
    const uncategorized = allTransactions.filter((t: any) => !t.category_id);

    const stats = {
      total: allTransactions.length,
      categorized: categorized.length,
      uncategorized: uncategorized.length,
      completionRate: allTransactions.length > 0 ? (categorized.length / allTransactions.length) * 100 : 100,
      lastUpdated: new Date().toISOString()
    };

    console.log(`AI Statistics: ${categorized.length} categorized, ${uncategorized.length} uncategorized out of ${allTransactions.length} total`);

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting AI statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        total: 0,
        categorized: 0,
        uncategorized: 0,
        completionRate: 100,
        lastUpdated: new Date().toISOString()
      }
    };
  }
});

// Update Query Context (placeholder for Phase 2+)
ipcMain.handle('ai:updateContext', async () => {
  try {
    await initializeAIServices();

    console.log('Context update requested (no-op in Phase 1)');

    return {
      success: true,
      message: 'Context update not required for rule-based categorization (Phase 1)'
    };
  } catch (error) {
    console.error('Error updating context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Clear AI Models (no-op in Phase 1)
ipcMain.handle('ai:clearModels', async () => {
  try {
    console.log('Clear models requested (no-op in Phase 1)');

    return {
      success: true,
      message: 'No models to clear in rule-based system (Phase 1)'
    };
  } catch (error) {
    console.error('Error clearing AI models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Model Management (no-op in Phase 1)
ipcMain.handle('ai:preloadModels', async () => {
  return {
    success: true,
    message: 'No models to preload in rule-based system (Phase 1)'
  };
});

ipcMain.handle('ai:getModelStatus', async () => {
  return {
    success: true,
    statuses: [],
    memoryUsage: { current: 0, max: 0, percentage: 0 },
    message: 'No models in rule-based system (Phase 1)'
  };
});

ipcMain.handle('ai:loadModel', async (event, modelName: string) => {
  return {
    success: false,
    message: `Model loading not available in Phase 1 (requested: ${modelName})`
  };
});

ipcMain.handle('ai:unloadModel', async (event, modelName: string) => {
  return {
    success: false,
    message: `Model unloading not available in Phase 1 (requested: ${modelName})`
  };
});

// Financial Analysis (Phase 2+ features)
ipcMain.handle('ai:analyzeFinancialHealth', async () => {
  return {
    success: false,
    error: 'Financial analysis available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

ipcMain.handle('ai:optimizeLoans', async () => {
  return {
    success: false,
    error: 'Loan optimization available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

ipcMain.handle('ai:forecastBills', async () => {
  return {
    success: false,
    error: 'Bill forecasting available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

// Auto-Payee Creation
ipcMain.handle('ai:createPayeeFromTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories and payees directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();

    const result = await categorizationService.processTransaction(
      transaction,
      availableCategories,
      existingPayees
    );

    if (result.payeeExtraction && result.payeeExtraction.extracted) {
      // Create the new payee directly in database
      const payeeData = result.payeeExtraction.payee;
      const insertStmt = dbInstance.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const info = insertStmt.run(
        payeeData.name,
        payeeData.default_category_id || null
      );

      const newPayee = dbInstance.prepare('SELECT * FROM payees WHERE payee_id = ?').get(info.lastInsertRowid);

      return {
        success: true,
        payee: newPayee,
        confidence: result.payeeExtraction.confidence,
        categoryPredictions: result.categoryPredictions
      };
    } else {
      return {
        success: false,
        message: 'No new payee could be extracted from transaction'
      };
    }
  } catch (error) {
    console.error('Error creating payee from transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Export for use in main process
export const initializeAIHandlers = (db?: any) => {
  if (db) {
    dbInstance = db;
  }
  initializeAIServices(db);
  console.log('Rule-based AI categorization handlers initialized (Phase 1)');
};

// Cleanup on app quit
export const cleanupAIServices = async () => {
  categorizationService = null;
  console.log('AI services cleaned up');
};
