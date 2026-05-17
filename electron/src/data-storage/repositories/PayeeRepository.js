"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayeeRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class PayeeRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('payees');
    }
    mapToEntity(row) {
        return {
            payee_id: row.payee_id,
            name: row.name,
            default_category_id: row.default_category_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
    // Override create to handle payee details
    create(payee) {
        const payeeId = super.create(payee);
        // Create payee details if provided
        if (payee.details) {
            this.createPayeeDetails(payeeId, payee.details);
        }
        return payeeId;
    }
    // Override update to handle payee details
    update(id, payee) {
        const success = super.update(id, payee);
        // Update or create payee details if provided
        if (payee.details) {
            this.updatePayeeDetails(id, payee.details);
        }
        return success;
    }
    // Override getById to include details
    getById(id) {
        const payee = super.getById(id);
        if (payee) {
            payee.details = this.getPayeeDetails(id);
        }
        return payee;
    }
    // Override getAll to include details
    getAll() {
        const payees = super.getAll();
        return payees.map(payee => ({
            ...payee,
            details: this.getPayeeDetails(payee.payee_id)
        }));
    }
    // Get payee details
    getPayeeDetails(payeeId) {
        const query = `SELECT * FROM payee_details WHERE payee_id = ?`;
        const statement = this.db.prepare(query);
        const row = statement.get(payeeId);
        if (!row)
            return undefined;
        return {
            payee_id: row.payee_id,
            business_type: row.business_type,
            website: row.website,
            phone: row.phone,
            address: row.address,
            auto_categorization_rules: row.auto_categorization_rules,
            payment_methods: row.payment_methods,
            typical_amount_range: row.typical_amount_range,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
    // Create payee details
    createPayeeDetails(payeeId, details) {
        const query = `
      INSERT INTO payee_details (
        payee_id, business_type, website, phone, address,
        auto_categorization_rules, payment_methods, typical_amount_range
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const statement = this.db.prepare(query);
        statement.run(payeeId, details.business_type, details.website, details.phone, details.address, details.auto_categorization_rules, details.payment_methods, details.typical_amount_range);
    }
    // Update payee details
    updatePayeeDetails(payeeId, details) {
        // Try to update existing details first
        const updateQuery = `
      UPDATE payee_details SET
        business_type = ?,
        website = ?,
        phone = ?,
        address = ?,
        auto_categorization_rules = ?,
        payment_methods = ?,
        typical_amount_range = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE payee_id = ?
    `;
        const updateStatement = this.db.prepare(updateQuery);
        const result = updateStatement.run(details.business_type, details.website, details.phone, details.address, details.auto_categorization_rules, details.payment_methods, details.typical_amount_range, payeeId);
        // If no rows were updated, create new details
        if (result.changes === 0) {
            this.createPayeeDetails(payeeId, details);
        }
    }
    // Get enhanced payees with transaction statistics
    getEnhancedPayees() {
        const query = `
      SELECT 
        p.*,
        pd.*,
        COUNT(t.transaction_id) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount,
        MAX(t.date) as last_transaction_date
      FROM payees p
      LEFT JOIN payee_details pd ON p.payee_id = pd.payee_id
      LEFT JOIN transactions t ON p.payee_id = t.payee_id
      GROUP BY p.payee_id
      ORDER BY p.name ASC
    `;
        const statement = this.db.prepare(query);
        const rows = statement.all();
        return rows.map((row) => ({
            payee_id: row.payee_id,
            name: row.name,
            default_category_id: row.default_category_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            details: row.business_type ? {
                payee_id: row.payee_id,
                business_type: row.business_type,
                website: row.website,
                phone: row.phone,
                address: row.address,
                auto_categorization_rules: row.auto_categorization_rules,
                payment_methods: row.payment_methods,
                typical_amount_range: row.typical_amount_range,
                created_at: row.created_at,
                updated_at: row.updated_at,
            } : undefined,
            transaction_count: row.transaction_count,
            total_amount: row.total_amount,
            average_amount: row.average_amount,
            last_transaction_date: row.last_transaction_date,
        }));
    }
    // Search payees by name
    searchByName(searchTerm) {
        const query = `
      SELECT * FROM payees 
      WHERE name LIKE ? 
      ORDER BY name ASC
    `;
        const statement = this.db.prepare(query);
        const rows = statement.all(`%${searchTerm}%`);
        return rows.map((row) => ({
            ...this.mapToEntity(row),
            details: this.getPayeeDetails(row.payee_id)
        }));
    }
    // Get payees by business type
    getByBusinessType(businessType) {
        const query = `
      SELECT p.* FROM payees p
      JOIN payee_details pd ON p.payee_id = pd.payee_id
      WHERE pd.business_type = ?
      ORDER BY p.name ASC
    `;
        const statement = this.db.prepare(query);
        const rows = statement.all(businessType);
        return rows.map((row) => ({
            ...this.mapToEntity(row),
            details: this.getPayeeDetails(row.payee_id)
        }));
    }
    // Find payee by name (case-insensitive)
    findByName(name) {
        const query = `SELECT * FROM payees WHERE LOWER(name) = LOWER(?) LIMIT 1`;
        const statement = this.db.prepare(query);
        const row = statement.get(name);
        if (!row)
            return null;
        const payee = this.mapToEntity(row);
        payee.details = this.getPayeeDetails(payee.payee_id);
        return payee;
    }
    // Create payee only if it doesn't exist (case-insensitive)
    createIfNotExists(payee) {
        const existingExact = this.findByName(payee.name);
        if (existingExact) {
            return { id: existingExact.payee_id, created: false };
        }
        const normalizedTarget = this.normalizePayeeName(payee.name);
        const allPayees = this.getAll();
        const existingNormalized = allPayees.find(p => this.normalizePayeeName(p.name) === normalizedTarget);
        if (existingNormalized && existingNormalized.payee_id) {
            return { id: existingNormalized.payee_id, created: false };
        }
        const id = this.create(payee);
        return { id, created: true };
    }
    // Normalize payee name for duplicate detection
    normalizePayeeName(name) {
        const basic = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        // Split into tokens so we can drop obvious bank/processor codes
        const tokens = basic.split(' ');
        const filtered = tokens.filter((token, index) => {
            // Drop leading 6-digit date-like codes (e.g. "250919 Applecom Bill ...")
            if (index === 0 && /^\d{6}$/.test(token)) {
                return false;
            }
            // Drop trailing S-codes like "S305242718808044" that vary per transaction
            if (/^s\d{6,}$/.test(token)) {
                return false;
            }
            return true;
        });
        const withoutCodes = filtered.join(' ').trim();
        // Still remove any trailing pure numeric token if present
        return withoutCodes.replace(/\s+\d+$/, '');
    }
}
exports.PayeeRepository = PayeeRepository;
