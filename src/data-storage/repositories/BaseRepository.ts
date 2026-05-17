import { DatabaseConnection } from '../database/DatabaseConnection';
import Database from 'better-sqlite3';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected db: Database.Database;
  private tableColumns?: Set<string>;
  
  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = DatabaseConnection.getInstance();
  }
  
  protected abstract mapToEntity(row: any): T;

  private getDefaultIdField(): string {
    if (this.tableName.endsWith('ies')) {
      return `${this.tableName.slice(0, -3)}y_id`;
    }

    if (this.tableName.endsWith('s')) {
      return `${this.tableName.slice(0, -1)}_id`;
    }

    return `${this.tableName}_id`;
  }

  private getTableColumns(): Set<string> {
    if (!this.tableColumns) {
      const columns = this.db
        .prepare(`PRAGMA table_info(${this.tableName})`)
        .all() as Array<{ name: string }>;

      this.tableColumns = new Set(columns.map((column) => column.name));
    }

    return this.tableColumns;
  }

  private normalizeSqlValue(value: unknown): unknown {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return value;
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const tableColumns = this.getTableColumns();

    return Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => tableColumns.has(key))
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, this.normalizeSqlValue(value)])
    );
  }
  
  /**
   * Get all records from the table
   */
  public getAll(): T[] {
    const statement = this.db.prepare(`SELECT * FROM ${this.tableName}`);
    const rows = statement.all();
    return rows.map(row => this.mapToEntity(row));
  }
  
  /**
   * Get a record by its ID
   */
  public getById(id: number, idField: string = this.getDefaultIdField()): T | null {
    const statement = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${idField} = ?`);
    const row = statement.get(id);
    return row ? this.mapToEntity(row) : null;
  }
  
  /**
   * Create a new record
   */
  public create(data: Partial<T>, idField: string = this.getDefaultIdField()): number {
    // Remove any ID field if present (as it's auto-generated)
    const { [idField]: _, ...rawInsertData } = data as any;
    const insertData = this.sanitizeData(rawInsertData);
    
    // Build the query dynamically based on the data object
    const keys = Object.keys(insertData);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => insertData[key]);
    
    const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const statement = this.db.prepare(query);
    
    const result = statement.run(...values);
    return result.lastInsertRowid as number;
  }
  
  /**
   * Update an existing record
   */
  public update(id: number, data: Partial<T>, idField: string = this.getDefaultIdField()): boolean {
    // Remove any ID field from the update data
    const { [idField]: _, ...rawUpdateData } = data as any;
    const updateData = this.sanitizeData(rawUpdateData);
    
    // Set updated_at if it exists in the table
    const hasUpdatedAt = this.db.prepare(`PRAGMA table_info(${this.tableName})`).all()
      .some((col: any) => col.name === 'updated_at');
    
    if (hasUpdatedAt) {
      (updateData as any).updated_at = new Date().toISOString();
    }
    
    // Build the query dynamically based on the data object
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateData), id];
    
    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${idField} = ?`;
    const statement = this.db.prepare(query);
    
    const result = statement.run(...values);
    return result.changes > 0;
  }
  
  /**
   * Delete a record by its ID
   */
  public delete(id: number, idField: string = this.getDefaultIdField()): boolean {
    const statement = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${idField} = ?`);
    const result = statement.run(id);
    return result.changes > 0;
  }
  
  /**
   * Find records by a field value
   */
  public findBy(field: string, value: any): T[] {
    const statement = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`);
    const rows = statement.all(value);
    return rows.map(row => this.mapToEntity(row));
  }
  
  /**
   * Run a custom query and map the results
   */
  protected runQuery(query: string, params: any[] = []): T[] {
    const statement = this.db.prepare(query);
    const rows = statement.all(...params);
    return rows.map(row => this.mapToEntity(row));
  }
  
  /**
   * Run a custom query that returns a single result
   */
  protected runQuerySingle(query: string, params: any[] = []): T | null {
    const statement = this.db.prepare(query);
    const row = statement.get(...params);
    return row ? this.mapToEntity(row) : null;
  }
}
