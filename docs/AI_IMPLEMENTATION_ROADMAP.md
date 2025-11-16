# AI Implementation Roadmap

**Project:** Personal Finance Manager - Transaction Categorization System
**Owner:** Kledi
**Last Updated:** 2025-09-30
**Status:** Phase 1 In Progress

---

## Overview

This roadmap tracks the implementation of a privacy-first, local-learning transaction categorization system. We are moving away from heavy 7B models (Mistral, CodeLlama) to a lightweight, practical approach that works on any hardware.

**Core Principles:**
- ✅ Privacy first - all data stays local
- ✅ No servers required
- ✅ Honest about accuracy (starts 75%, grows to 90%+)
- ✅ Users can optionally add their own API keys
- ✅ Progressive enhancement over time

---

## Phase 1: Rule-Based Foundation (Week 1)

**Timeline:** 2025-09-30 to 2025-10-06
**Status:** 🟡 In Progress
**Goal:** Deploy working categorization with 75-80% accuracy

### Tasks

#### ✅ Completed
- [x] Create AI strategy documentation (`/docs/AI_STRATEGY.md`)
- [x] Analyze user's transaction data (450+ transactions)
- [x] Identify merchant patterns and categories
- [x] Establish baseline accuracy expectations
- [x] Fix database initialization issue (AIRepository lazy loading implemented)
- [x] Create AI implementation roadmap (this document)
- [x] Rename MistralAI files to TransactionCategorization
  - `MistralAIProcessor.ts` → `TransactionCategorizationService.ts`
  - Updated all references in aiHandlers.ts
  - Marked unused files as deprecated

#### 🟡 In Progress
- [ ] Build rule-based categorization engine
  - Enhance categorization logic with user's merchant patterns
  - Add 65+ merchant patterns from transaction analysis
  - Implement confidence scoring
  - Add amount-based heuristics

#### ⏳ Pending
- [ ] Create training data schema
  - `ai_training_data` table
  - `ai_model_performance` table
  - `ai_user_preferences` table
- [ ] Test categorization accuracy with real data
- [ ] Deploy to production

### Success Criteria
- ✅ Database initialization works without errors
- ✅ 75-80% of transactions auto-categorized correctly
- ✅ High confidence (>85%) for known merchants
- ✅ Graceful fallback for unknown merchants
- ✅ No breaking changes to existing functionality

### Blockers & Risks
- ✅ **RESOLVED:** Database initialization issue fixed with lazy loading pattern
- ✅ **RESOLVED:** File renaming completed without breaking changes
- 🟢 **LOW:** Transaction data structure stable, no schema changes needed

---

## Phase 2: Configuration & Polish (Week 2-3)

**Timeline:** 2025-10-07 to 2025-10-20
**Status:** ⏳ Not Started
**Goal:** Make rules manageable and improve user experience

### Tasks

- [ ] Extract categorization rules to configuration file
  - Create `CategoryRules.ts` with structured merchant patterns
  - Separate rules from logic for easier maintenance
- [ ] Create rule management interface
  - UI for viewing current rules
  - Admin panel for adding/editing patterns (future)
- [ ] Database-driven pattern storage
  - Create `categorization_rules` table
  - Migrate hardcoded patterns to database
  - Allow dynamic rule updates
- [ ] Performance optimization
  - Cache category lookups
  - Optimize batch categorization
  - Profile and improve hot paths
- [ ] User feedback UI enhancements
  - Show confidence scores in transaction list
  - One-click correction workflow
  - "AI is learning" progress indicators
- [ ] Add welcome/onboarding message
  - Explain privacy-first approach
  - Set accuracy expectations
  - Highlight that AI improves over time

### Success Criteria
- ✅ Rules are easy to update without code changes
- ✅ Users understand accuracy will improve
- ✅ Correction workflow is smooth
- ✅ Performance is <50ms per transaction

### Dependencies
- Phase 1 must be complete and stable
- UI components may need minor updates

---

## Phase 3: ML Learning Foundation (Month 2)

**Timeline:** 2025-11-01 to 2025-11-30
**Status:** ⏳ Not Started
**Goal:** Implement machine learning that learns from user corrections

### Tasks

- [ ] Design training data pipeline
  - Capture all user corrections
  - Store feature vectors (description, amount, date)
  - Track model performance over time
- [ ] Implement scikit-learn model (Python bridge)
  - TF-IDF vectorization for transaction descriptions
  - Naive Bayes or Logistic Regression classifier
  - Model persistence (pickle)
- [ ] Create training script
  - `train_model.py` - trains on user corrections
  - Validation split for accuracy measurement
  - Export model for inference
- [ ] Integrate model predictions
  - Call Python script from Node.js
  - Fallback to rule-based if model unavailable
  - Cache predictions for performance
- [ ] Implement auto-retraining
  - Nightly background job
  - Retrain when 20+ new corrections available
  - Version models and track accuracy improvements
- [ ] Build accuracy dashboard
  - Show current model performance
  - Display learning progress over time
  - Celebrate improvements ("Your AI got 5% smarter!")

### Success Criteria
- ✅ Model trains successfully on user corrections
- ✅ Accuracy improves from 80% → 85-90% after 100 corrections
- ✅ Personalized to user's spending patterns
- ✅ Training completes in <30 seconds
- ✅ Users see visible improvement over time

### Technical Requirements
- Python 3.12+ already installed ✅
- scikit-learn library
- Model file storage (~5-20MB)
- Background job scheduler

---

## Phase 4: Optional API Enhancement (Month 3)

**Timeline:** 2025-12-01 to 2025-12-31
**Status:** ⏳ Not Started
**Goal:** Allow users to add their own API keys for edge cases

### Tasks

- [ ] Design BYO API key settings UI
  - Provider selection (OpenAI, Anthropic)
  - Secure key input field
  - Connection test button
  - Usage dashboard
- [ ] Implement API integrations
  - OpenAI GPT-3.5/4 integration
  - Anthropic Claude integration
  - Error handling and retry logic
- [ ] Add confidence-based API fallback
  - Use API only for low confidence (<70%) transactions
  - Track API usage and costs
  - Monthly budget warnings
- [ ] Build usage tracking
  - Log API calls and estimated costs
  - Show monthly spend to user
  - Alert when approaching budget limit
- [ ] Encryption for API keys
  - Secure local storage
  - Never log or transmit keys
  - Clear documentation on security

### Success Criteria
- ✅ Users can add their own API keys
- ✅ API only called for ambiguous transactions
- ✅ Users aware of costs (~$3-5/year typical)
- ✅ Accuracy reaches 95%+ with API enhancement
- ✅ API keys stored securely

### Cost Analysis
- **Without API:** $0/year
- **With API (light use):** ~$3-5/year per user
- **With API (heavy use):** ~$10-18/year per user
- User pays directly to API provider (OpenAI/Anthropic)

---

## Phase 5: TensorFlow.js Migration (Month 4-6)

**Timeline:** 2026-01-01 to 2026-03-31
**Status:** ⏳ Not Started
**Goal:** Eliminate Python dependency, pure JavaScript ML

### Tasks

- [ ] Research TensorFlow.js architecture
  - Model equivalent to scikit-learn
  - Performance benchmarks
  - Migration path planning
- [ ] Export training data
  - Convert from Python format to TF.js format
  - Validate data integrity
- [ ] Build TensorFlow.js model
  - Embedding layer for text
  - LSTM or Dense layers
  - Softmax output for categories
- [ ] Train initial model
  - Use exported historical data
  - Validate accuracy matches Python model
  - Optimize hyperparameters
- [ ] Implement in-app training
  - Train directly in Electron
  - No Python dependency
  - Background training process
- [ ] Side-by-side testing
  - Run both models in parallel
  - Compare accuracy and performance
  - Validate migration success
- [ ] Cut over to TensorFlow.js
  - Remove Python bridge
  - Update documentation
  - Deploy to production

### Success Criteria
- ✅ No Python dependency
- ✅ Accuracy matches or exceeds Python model
- ✅ Inference time <50ms
- ✅ Model size <50MB
- ✅ Training works in-app

### Benefits
- Faster startup (no Python bridge initialization)
- Easier deployment (one language)
- Better integration with Electron
- Same accuracy, better UX

---

## Future Enhancements (Beyond Month 6)

### Transfer Learning (Optional)
- Start with pre-trained DistilBERT embeddings
- Fine-tune on user's financial transactions
- Higher accuracy with less training data
- **Complexity:** HIGH
- **Benefit:** 92-95% accuracy possible

### Federated Learning (Optional)
- Users opt-in to share model improvements (not data)
- Aggregate learnings across users
- Privacy-preserving
- New users benefit from collective knowledge
- **Complexity:** VERY HIGH
- **Benefit:** Cold start problem solved

### Multi-Language Support
- Internationalize merchant patterns
- Support non-English transactions
- Currency conversion logic
- **Complexity:** MEDIUM
- **Benefit:** Global user base

---

## Metrics & KPIs

### Phase 1 Targets
- **Accuracy:** 75-80% (rule-based)
- **Confidence:** >85% for known merchants
- **Performance:** <10ms per transaction
- **Coverage:** 100+ merchant patterns

### Phase 3 Targets (ML Learning)
- **Accuracy:** 85-90% (after 100 corrections)
- **Improvement Rate:** +1% per 20 corrections
- **Personalization:** User-specific patterns detected
- **Training Time:** <30 seconds

### Phase 4 Targets (API Enhancement)
- **Accuracy:** 95%+ (with API)
- **API Usage:** <20% of transactions
- **User Cost:** <$5/year average
- **Satisfaction:** User reports improved accuracy

---

## Risk Management

### High Priority Risks

**RISK: Database initialization fails**
- **Impact:** HIGH - Core functionality blocked
- **Probability:** RESOLVED - Fixed with lazy loading
- **Mitigation:** Implemented lazy loading pattern for AIRepository
- **Owner:** Completed
- **Status:** ✅ Resolved

**RISK: Rule-based accuracy below 75%**
- **Impact:** MEDIUM - Users frustrated, many manual corrections
- **Probability:** LOW - Transaction analysis shows clear patterns
- **Mitigation:** Test with real data, iterate on patterns
- **Owner:** Phase 1 validation
- **Status:** 🟢 Low risk

### Medium Priority Risks

**RISK: Renaming breaks existing functionality**
- **Impact:** HIGH - App could break
- **Probability:** RESOLVED - Completed successfully
- **Mitigation:** Completed with careful refactoring and compilation
- **Owner:** Completed
- **Status:** ✅ Resolved

**RISK: Python dependency causes deployment issues**
- **Impact:** MEDIUM - Harder to deploy
- **Probability:** MEDIUM - Windows/Mac Python variations
- **Mitigation:** TensorFlow.js migration in Phase 5
- **Owner:** Phase 5 planning
- **Status:** 🟡 Long-term concern

### Low Priority Risks

**RISK: Users don't correct enough for ML to learn**
- **Impact:** MEDIUM - ML doesn't improve
- **Probability:** LOW - Users motivated to improve accuracy
- **Mitigation:** Gamification, progress indicators
- **Owner:** Phase 2 UX enhancements
- **Status:** 🟢 Low concern

---

## Dependencies

### External Dependencies
- **Python 3.12+** ✅ Installed
- **scikit-learn** ⏳ Needs installation (Phase 3)
- **TensorFlow.js** ⏳ Needs installation (Phase 5)
- **OpenAI/Anthropic SDKs** ⏳ Optional (Phase 4)

### Internal Dependencies
- **Database Schema** ✅ Stable
- **Transaction Model** ✅ Stable
- **Category System** ✅ Stable
- **IPC Handlers** ✅ Existing, needs enhancement
- **UI Components** ⏳ Minor updates needed

---

## Success Definitions

### Phase 1 Success
"Users can import transactions and 75%+ are automatically categorized correctly with high confidence, requiring minimal manual corrections."

### Phase 3 Success
"After 100 corrected transactions, accuracy improves to 85-90%, personalized to the user's spending patterns, and users report visible improvement over time."

### Overall Project Success
"Users trust the AI categorization, rarely need manual corrections, appreciate the privacy-first approach, and the system becomes more accurate the more they use it."

---

## Maintenance Plan

### Weekly During Active Development
- Review progress against roadmap
- Update status and blockers
- Adjust timelines if needed

### Monthly After Phase 3
- Monitor accuracy metrics
- Review user feedback
- Plan incremental improvements

### Quarterly Review
- Assess overall system health
- Consider new features
- Evaluate technology choices

---

## Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-09-30 | 1.0 | Initial roadmap creation | Claude |
| 2025-09-30 | 1.1 | Updated Phase 1 progress - marked database fix, file renaming, and roadmap creation as completed | Claude |
| TBD | 2.0 | Phase 2-3 detailed planning | TBD |

---

## Notes

- This roadmap is a living document and will be updated as we progress
- Timelines are estimates and may shift based on complexity and priorities
- Each phase builds on the previous, ensuring stable incremental progress
- User feedback will drive prioritization of future enhancements

---

**Next Review Date:** 2025-10-06 (End of Phase 1)
**Next Major Milestone:** Phase 1 completion - 75-80% categorization accuracy
