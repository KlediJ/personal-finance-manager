# AI Strategy & Architecture

**Last Updated:** 2025-09-30
**Status:** Phase 1 - Local ML Learning
**Philosophy:** Privacy-First, No Servers Required

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Current Implementation (Phase 1)](#current-implementation-phase-1)
4. [User Experience & Expectations](#user-experience--expectations)
5. [Technical Architecture](#technical-architecture)
6. [Migration Path](#migration-path)
7. [Future Enhancements](#future-enhancements)
8. [Decision Log](#decision-log)

---

## Overview

This personal finance application uses **local machine learning** for transaction categorization. Unlike cloud-based solutions, all AI processing happens **on the user's device**, ensuring complete privacy and zero ongoing costs.

### Core Philosophy

**Privacy Over Convenience**
- ✅ All data stays on user's device
- ✅ No servers, no tracking, no data collection
- ✅ User owns their financial data 100%
- ⚠️ Trade-off: Lower initial accuracy (improves over time)

**User Pays Their Own API Costs (Optional Enhancement)**
- ✅ Users can optionally add their own API keys
- ✅ We don't pay API costs, users do (~$3-5/year)
- ✅ Optional upgrade path for users wanting higher accuracy
- ✅ No server infrastructure needed

---

## Design Principles

### 1. **No Server Dependency**
   - Application must work 100% offline
   - No backend servers to maintain
   - No data collection infrastructure
   - Zero recurring costs for developer or users

### 2. **Privacy-First**
   - Financial data is highly sensitive
   - Local-only processing by default
   - Clear opt-in for any external services
   - Transparent about what happens to data

### 3. **Progressive Enhancement**
   - Start with rule-based categorization (fast, 70-80% accuracy)
   - Learn from user corrections (85-90% accuracy after 100 transactions)
   - Optional API enhancement for edge cases (95%+ accuracy)

### 4. **Honest User Experience**
   - Don't oversell AI capabilities
   - Set clear expectations about accuracy curve
   - Educate users about privacy benefits
   - Celebrate improvements over time

---

## Current Implementation (Phase 1)

### Phase 1: Hybrid Rule-Based + Local ML Learning

**Launch State:**
```
┌─────────────────────────────────────────────┐
│  Transaction Categorization Flow            │
├─────────────────────────────────────────────┤
│                                             │
│  1. Rule-Based Engine (Primary)            │
│     ├─ Known merchant patterns             │
│     ├─ Keyword matching                    │
│     ├─ Amount heuristics                   │
│     └─ 70-80% accuracy out of box          │
│                                             │
│  2. Local ML Model (Learning)              │
│     ├─ Trains on user corrections          │
│     ├─ Starts at 50% accuracy              │
│     ├─ Reaches 85-90% after 100 examples   │
│     └─ Personalized to user's habits       │
│                                             │
│  3. User Correction (Feedback Loop)        │
│     ├─ User reviews & corrects             │
│     ├─ System learns from feedback         │
│     └─ Model retrains automatically        │
│                                             │
└─────────────────────────────────────────────┘
```

### Technical Stack
- **Rule Engine:** JavaScript (in codebase)
- **ML Model:** scikit-learn (Python bridge)
- **Storage:** SQLite (local database)
- **Training:** Background process (nightly retraining)
- **Model Size:** 5-20MB (lightweight)
- **Inference Time:** <10ms (instant)

---

## User Experience & Expectations

### Initial User Journey

#### **Week 1: Getting Started**
```
Accuracy: 70-75%
User Experience: "Decent but needs corrections"

┌─────────────────────────────────────────────┐
│  Welcome Message (First Launch)             │
├─────────────────────────────────────────────┤
│                                             │
│  🔒 Your Privacy Matters                    │
│                                             │
│  This app uses local AI that learns from    │
│  YOUR corrections - not from the cloud.     │
│                                             │
│  Initial Accuracy: 70-75%                   │
│  After 50 corrections: ~85%                 │
│  After 100 corrections: ~90%                │
│                                             │
│  Your financial data NEVER leaves your      │
│  device. The trade-off? The AI starts      │
│  "dumb" but gets smarter as you use it.    │
│                                             │
│  [ I Understand - Let's Start ]            │
│                                             │
└─────────────────────────────────────────────┘
```

#### **Week 2-4: Learning Phase**
```
Accuracy: 75-85%
User Experience: "Getting noticeably better"

┌─────────────────────────────────────────────┐
│  Progress Indicator                         │
├─────────────────────────────────────────────┤
│  🧠 AI Learning Progress                    │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 52%                  │
│                                             │
│  23 corrections this week                   │
│  Accuracy improved from 72% → 83%          │
│                                             │
│  Keep correcting to help your AI learn!     │
└─────────────────────────────────────────────┘
```

#### **Month 2+: Mature Model**
```
Accuracy: 88-92%
User Experience: "Rarely needs correction"

┌─────────────────────────────────────────────┐
│  AI Status: Excellent                       │
├─────────────────────────────────────────────┤
│  ✨ Your AI is performing great!           │
│                                             │
│  Current Accuracy: 91%                      │
│  Based on 127 corrections                   │
│                                             │
│  Last week: Only 3 corrections needed       │
└─────────────────────────────────────────────┘
```

### User Settings & Options

```
┌─────────────────────────────────────────────┐
│  AI & Categorization Settings               │
├─────────────────────────────────────────────┤
│                                             │
│  🔒 Privacy Mode: Local Only                │
│  ├─ [x] Learn from my corrections           │
│  ├─ [x] Auto-retrain nightly                │
│  └─ [ ] Share anonymous patterns (future)   │
│                                             │
│  📊 Performance                             │
│  ├─ Current Accuracy: 87%                   │
│  ├─ Total Corrections: 94                   │
│  └─ Model Last Trained: 2 hours ago         │
│                                             │
│  ⚡ Optional Enhancements                   │
│  ├─ [ ] Enable API fallback for edge cases  │
│  └─ API Key: [___________________] (BYO)    │
│                                             │
│  ℹ️ API Enhancement Info                    │
│  Adding your own OpenAI/Anthropic API key   │
│  enables higher accuracy (95%+) for         │
│  ambiguous transactions.                    │
│                                             │
│  You pay API provider directly (~$3-5/year) │
│  We never see your API key or data.         │
│                                             │
│  [ Learn More ] [ Save Settings ]           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Pipeline

```
┌─────────────────────────────────────────────┐
│  Transaction Input                          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Rule-Based Engine (Primary)                │
│  ├─ Merchant pattern matching               │
│  ├─ Keyword analysis                        │
│  └─ Amount heuristics                       │
└────────────────┬────────────────────────────┘
                 │
                 ├─► High Confidence (>90%)
                 │   └─► Return Category
                 │
                 ├─► Medium Confidence (60-90%)
                 │   └─► Check ML Model
                 │       └─► Return Best Prediction
                 │
                 └─► Low Confidence (<60%)
                     └─► Flag for User Review
```

### Learning Loop

```
┌─────────────────────────────────────────────┐
│  1. User Reviews Transaction                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  2. User Corrects Category (if needed)      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  3. Store in Training Database              │
│     ├─ Description                          │
│     ├─ Amount, Date, Merchant              │
│     ├─ User's Category Choice               │
│     └─ Confidence Score                     │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  4. Background Retraining (Nightly)         │
│     ├─ Load all training examples           │
│     ├─ Retrain ML model                     │
│     ├─ Validate accuracy                    │
│     └─ Save updated model                   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  5. Improved Predictions Next Day           │
└─────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Training data (user's corrections)
CREATE TABLE ai_training_data (
  training_id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER,

  -- Raw inputs
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  merchant TEXT,
  account_id INTEGER,

  -- Extracted features
  features JSON,  -- {dayOfWeek, timeOfMonth, amountBucket, keywords}

  -- Labels
  category_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,

  -- Metadata
  model_confidence REAL,
  was_correction BOOLEAN DEFAULT FALSE,
  correction_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Model performance tracking
CREATE TABLE ai_model_performance (
  performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_version TEXT NOT NULL,

  -- Metrics
  accuracy REAL,
  training_examples_count INTEGER,
  predictions_count INTEGER,
  corrections_count INTEGER,

  -- Training info
  trained_at TIMESTAMP,
  training_duration_ms INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE ai_user_preferences (
  user_id INTEGER PRIMARY KEY DEFAULT 1,

  -- Local learning
  auto_retrain_enabled BOOLEAN DEFAULT TRUE,
  show_confidence_scores BOOLEAN DEFAULT TRUE,
  auto_categorize_threshold REAL DEFAULT 0.85,

  -- API enhancement (optional)
  api_enabled BOOLEAN DEFAULT FALSE,
  api_provider TEXT,  -- 'openai' | 'anthropic'
  api_key_encrypted TEXT,
  api_fallback_threshold REAL DEFAULT 0.70,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Model Training Pipeline

```python
# train_model.py - Background training script

import sqlite3
import pickle
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from datetime import datetime

def train_categorization_model(db_path):
    """Train ML model on user's correction history"""

    # 1. Load training data
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    data = cursor.execute("""
        SELECT description, category_name
        FROM ai_training_data
        WHERE was_correction = 1 OR model_confidence < 0.9
        ORDER BY created_at DESC
    """).fetchall()

    if len(data) < 20:
        print("Not enough training data yet (need 20+ examples)")
        return None

    descriptions = [row[0] for row in data]
    categories = [row[1] for row in data]

    # 2. Train model
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),
            min_df=2
        )),
        ('classifier', MultinomialNB())
    ])

    # Split for validation
    X_train, X_test, y_train, y_test = train_test_split(
        descriptions, categories, test_size=0.2, random_state=42
    )

    pipeline.fit(X_train, y_train)

    # 3. Calculate accuracy
    accuracy = pipeline.score(X_test, y_test)

    # 4. Save model
    model_path = './models/user_categorization_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)

    # 5. Log performance
    cursor.execute("""
        INSERT INTO ai_model_performance (
            model_version, accuracy, training_examples_count,
            trained_at, training_duration_ms
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        f"v{datetime.now().strftime('%Y%m%d_%H%M')}",
        accuracy,
        len(data),
        datetime.now().isoformat(),
        0  # Track this in production
    ))

    conn.commit()
    conn.close()

    print(f"Model trained! Accuracy: {accuracy:.2%} on {len(data)} examples")
    return pipeline

if __name__ == "__main__":
    train_categorization_model('./userData/finance.db')
```

---

## Migration Path

### Phase 1: Python-Based ML (Current) → Phase 2: TensorFlow.js

**When to migrate:** After 6 months, once we have validated the approach and want to eliminate Python dependency.

**Migration Steps:**

1. **Export Training Data** (1 hour)
   ```javascript
   const trainingData = await db.query(`
     SELECT * FROM ai_training_data
   `);

   fs.writeFileSync('training_export.json',
     JSON.stringify(trainingData)
   );
   ```

2. **Convert to TensorFlow Format** (4 hours)
   ```javascript
   import * as tf from '@tensorflow/tfjs-node';

   // Build model
   const model = tf.sequential({
     layers: [
       tf.layers.embedding({inputDim: vocabSize, outputDim: 64}),
       tf.layers.lstm({units: 64}),
       tf.layers.dense({units: numCategories, activation: 'softmax'})
     ]
   });

   // Train on existing data
   await model.fit(trainingData.xs, trainingData.ys, {
     epochs: 20,
     batchSize: 32,
     validationSplit: 0.2
   });

   // Save
   await model.save('file://./models/tfjs-categorization');
   ```

3. **Update Inference Code** (2 hours)
   ```javascript
   // Old: Python bridge
   const prediction = await pythonBridge.predict(description);

   // New: Pure JavaScript
   const prediction = await tfjsModel.predict(description);
   ```

4. **Testing & Validation** (4 hours)

**Total Migration Time: 1-2 days**

**Benefits:**
- ✅ Eliminate Python dependency
- ✅ Faster startup (no Python bridge initialization)
- ✅ Easier deployment
- ✅ Same accuracy

---

## Future Enhancements

### Phase 2: Optional API Enhancement (Month 3-4)

**User-Controlled API Integration:**

```javascript
// Only used when user opts in AND provides their own key

if (confidence < 0.70 && user.hasAPIKey && user.apiEnabled) {
  // Call user's API for ambiguous transactions only
  const apiResult = await callUserAPI(transaction, user.apiKey);

  // Track usage for user's dashboard
  await db.insert('api_usage_log', {
    transaction_id: transaction.id,
    cost_estimate: 0.001,
    provider: user.apiProvider
  });

  return apiResult;
}
```

**User Settings:**
```
API Enhancement (Optional)
├─ Provider: [ OpenAI ▼ ]
├─ API Key: [•••••••••••]
├─ Use for: [ Only Low Confidence (<70%) ▼ ]
├─ Monthly Budget: [ $5.00 ] (warn me if exceeded)
└─ This Month: $0.47 (47 API calls)
```

### Phase 3: TensorFlow.js Migration (Month 6)

- Eliminate Python dependency
- Pure JavaScript implementation
- Same accuracy, faster initialization

### Phase 4: Transfer Learning (Month 12+)

- Start with pre-trained financial embeddings
- Fine-tune on user's data
- Higher accuracy (92-95%) with less training data

---

## Decision Log

### September 30, 2025 - Initial AI Strategy

**Context:**
- Evaluated 7B local models (Mistral, CodeLlama)
- Considered API-based solutions (OpenAI, Anthropic)
- Analyzed hardware requirements and user experience

**Decisions:**

1. **No Servers** ✅
   - Reason: Avoid ongoing costs, privacy concerns, and maintenance burden
   - Trade-off: Can't share learnings across users initially

2. **Local ML Learning** ✅
   - Reason: Privacy-first, works offline, personalized to user
   - Trade-off: Lower initial accuracy (improves over time)

3. **Reject 7B Local Models** ❌
   - Reason: Too slow on consumer hardware (4-6 sec per transaction)
   - Reason: Overkill for transaction categorization
   - Reason: Hardware requirements too high (16GB+ RAM)

4. **User BYO API Keys (Optional)** ✅
   - Reason: Users who want higher accuracy can opt in
   - Reason: We don't pay API costs
   - Reason: Still respects privacy (user controls their key)

5. **Honest UX About Accuracy** ✅
   - Reason: Set realistic expectations
   - Reason: Celebrate privacy benefits
   - Reason: Show progress over time

**Alternative Considered:** Anonymous pattern aggregation
- **Rejected:** Requires server infrastructure
- **Revisit:** If users request it and we're willing to maintain a simple server

---

## FAQ

### For Users

**Q: Why is the AI not very accurate at first?**
A: We prioritize your privacy. The AI learns from YOUR data on YOUR device, not from the cloud. It starts "dumb" but gets smarter as you correct it. After 50-100 corrections, it'll be very accurate and personalized to your spending habits.

**Q: Can I make it more accurate?**
A: Yes! You have two options:
1. Keep using it - accuracy improves to 90%+ over time
2. Add your own OpenAI/Anthropic API key for 95%+ accuracy (you pay ~$3-5/year directly to them)

**Q: Does my data ever leave my device?**
A: No. Everything runs locally. If you optionally add an API key, only ambiguous transactions are sent to your chosen provider (OpenAI/Anthropic), not us.

**Q: Why not use ChatGPT for everything?**
A: We could, but then either (1) we'd pay API costs forever (unsustainable), or (2) you'd pay us a subscription. We chose privacy and zero costs instead. You can still add your own API key if you want.

### For Developers

**Q: Why Python for ML if the app is Electron/JavaScript?**
A: Phase 1 uses Python because scikit-learn is battle-tested and simple. Phase 2 migrates to TensorFlow.js (pure JavaScript). The data format stays the same, making migration easy.

**Q: Why not just use rule-based categorization?**
A: We do! Rules handle 70-80% accurately. ML adds personalization - your "Amazon" might be books (education) while another user's is household supplies.

**Q: How do we handle cold start?**
A: Rule-based engine provides decent initial accuracy (70-80%). ML enhances it over time. Optional API provides instant high accuracy for users who opt in.

**Q: What if a user has only 10 transactions?**
A: Model needs 20-50+ to be useful. Until then, rule-based engine is primary. UI shows "AI learning progress" to set expectations.

---

## Implementation Checklist

### Phase 1: Foundation (Current Sprint)

- [ ] Fix database initialization issue
- [ ] Create `ai_training_data` table
- [ ] Create `ai_model_performance` table
- [ ] Create `ai_user_preferences` table
- [ ] Implement training data collection on user corrections
- [ ] Build Python training script (`train_model.py`)
- [ ] Integrate model predictions with existing categorization flow
- [ ] Add nightly auto-retrain background job
- [ ] Create "AI Learning Progress" UI component
- [ ] Write welcome message explaining privacy-accuracy trade-off
- [ ] Add accuracy dashboard to settings

### Phase 2: API Enhancement (Month 3-4)

- [ ] Design BYO API key settings UI
- [ ] Implement secure local storage for API keys
- [ ] Add OpenAI integration
- [ ] Add Anthropic integration
- [ ] Implement confidence-based API fallback
- [ ] Add API usage tracking and cost estimation
- [ ] Create monthly budget warnings

### Phase 3: TensorFlow.js Migration (Month 6)

- [ ] Export training data pipeline
- [ ] Build TensorFlow.js model architecture
- [ ] Train initial model on exported data
- [ ] Implement inference in JavaScript
- [ ] Side-by-side testing (Python vs TensorFlow.js)
- [ ] Cut over to TensorFlow.js
- [ ] Remove Python dependency

---

## Resources

### Internal Documentation
- `/src/data-processing/ai/MistralAIProcessor.ts` - Current AI processor (simulation mode)
- `/src/data-storage/repositories/AIRepository.ts` - AI database operations
- `/src/data-storage/services/AIMetricsService.ts` - Metrics tracking
- `/electron/ai/ModelManager.ts` - Model loading infrastructure (currently unused)

### External References
- [scikit-learn Classification](https://scikit-learn.org/stable/supervised_learning.html#supervised-learning)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Federated Learning (Future)](https://www.tensorflow.org/federated)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)

---

## Contact & Questions

For questions about this strategy, contact Kledi or see:
- `/docs/AI_IMPLEMENTATION.md` - Technical implementation details
- `/docs/AI_USER_GUIDE.md` - User-facing documentation
- GitHub Issues - For bug reports and feature requests

---

**Document Version:** 1.0
**Next Review:** After Phase 1 Implementation (Est. 2026-01-15)
