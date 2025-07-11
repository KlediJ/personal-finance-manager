import { BaseRepository } from './BaseRepository';
import { Payee, PayeeDetails, EnhancedPayee } from '../models/Payee';

export class PayeeRepository extends BaseRepository<Payee> {
  constructor() {
    super('payees');
  }

  protected mapToEntity(row: any): Payee {
    return {
      payee_id: row.payee_id,
      name: row.name,
      default_category_id: row.default_category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Override create to handle payee details
  public create(payee: Payee): number {
    const payeeId = super.create(payee);
    
    // Create payee details if provided
    if (payee.details) {
      this.createPayeeDetails(payeeId, payee.details);
    }
    
    return payeeId;
  }

  // Override update to handle payee details
  public update(id: number, payee: Payee): boolean {
    const success = super.update(id, payee);
    
    // Update or create payee details if provided
    if (payee.details) {
      this.updatePayeeDetails(id, payee.details);
    }
    
    return success;
  }

  // Override getById to include details
  public getById(id: number): Payee | null {
    const payee = super.getById(id);
    if (payee) {
      payee.details = this.getPayeeDetails(id);
    }
    return payee;
  }

  // Override getAll to include details
  public getAll(): Payee[] {
    const payees = super.getAll();
    return payees.map(payee => ({
      ...payee,
      details: this.getPayeeDetails(payee.payee_id!)
    }));
  }

  // Get payee details
  private getPayeeDetails(payeeId: number): PayeeDetails | undefined {
    const query = `SELECT * FROM payee_details WHERE payee_id = ?`;
    const statement = this.db.prepare(query);
    const row = statement.get(payeeId) as any;
    
    if (!row) return undefined;
    
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
  private createPayeeDetails(payeeId: number, details: PayeeDetails): void {
    const query = `
      INSERT INTO payee_details (
        payee_id, business_type, website, phone, address,
        auto_categorization_rules, payment_methods, typical_amount_range
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const statement = this.db.prepare(query);
    statement.run(
      payeeId,
      details.business_type,
      details.website,
      details.phone,
      details.address,
      details.auto_categorization_rules,
      details.payment_methods,
      details.typical_amount_range
    );
  }

  // Update payee details
  private updatePayeeDetails(payeeId: number, details: PayeeDetails): void {
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
    const result = updateStatement.run(
      details.business_type,
      details.website,
      details.phone,
      details.address,
      details.auto_categorization_rules,
      details.payment_methods,
      details.typical_amount_range,
      payeeId
    );
    
    // If no rows were updated, create new details
    if (result.changes === 0) {
      this.createPayeeDetails(payeeId, details);
    }
  }

  // Get enhanced payees with transaction statistics
  public getEnhancedPayees(): EnhancedPayee[] {
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
    
    return rows.map((row: any) => ({
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
  public searchByName(searchTerm: string): Payee[] {
    const query = `
      SELECT * FROM payees 
      WHERE name LIKE ? 
      ORDER BY name ASC
    `;
    
    const statement = this.db.prepare(query);
    const rows = statement.all(`%${searchTerm}%`);
    
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      details: this.getPayeeDetails(row.payee_id)
    }));
  }

  // Get payees by business type
  public getByBusinessType(businessType: string): Payee[] {
    const query = `
      SELECT p.* FROM payees p
      JOIN payee_details pd ON p.payee_id = pd.payee_id
      WHERE pd.business_type = ?
      ORDER BY p.name ASC
    `;
    
    const statement = this.db.prepare(query);
    const rows = statement.all(businessType);
    
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      details: this.getPayeeDetails(row.payee_id)
    }));
  }
}