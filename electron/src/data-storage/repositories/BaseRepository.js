"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const DatabaseConnection_1 = require("../database/DatabaseConnection");
class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = DatabaseConnection_1.DatabaseConnection.getInstance();
    }
    /**
     * Get all records from the table
     */
    getAll() {
        const statement = this.db.prepare(`SELECT * FROM ${this.tableName}`);
        const rows = statement.all();
        return rows.map(row => this.mapToEntity(row));
    }
    /**
     * Get a record by its ID
     */
    getById(id, idField = `${this.tableName.slice(0, -1)}_id`) {
        const statement = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${idField} = ?`);
        const row = statement.get(id);
        return row ? this.mapToEntity(row) : null;
    }
    /**
     * Create a new record
     */
    create(data, idField = `${this.tableName.slice(0, -1)}_id`) {
        // Remove any ID field if present (as it's auto-generated)
        const { [idField]: _, ...insertData } = data;
        // Build the query dynamically based on the data object
        const keys = Object.keys(insertData);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(key => insertData[key]);
        const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        const statement = this.db.prepare(query);
        const result = statement.run(...values);
        return result.lastInsertRowid;
    }
    /**
     * Update an existing record
     */
    update(id, data, idField = `${this.tableName.slice(0, -1)}_id`) {
        // Remove any ID field from the update data
        const { [idField]: _, ...updateData } = data;
        // Set updated_at if it exists in the table
        const hasUpdatedAt = this.db.prepare(`PRAGMA table_info(${this.tableName})`).all()
            .some((col) => col.name === 'updated_at');
        if (hasUpdatedAt) {
            updateData.updated_at = new Date().toISOString();
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
    delete(id, idField = `${this.tableName.slice(0, -1)}_id`) {
        const statement = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${idField} = ?`);
        const result = statement.run(id);
        return result.changes > 0;
    }
    /**
     * Find records by a field value
     */
    findBy(field, value) {
        const statement = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`);
        const rows = statement.all(value);
        return rows.map(row => this.mapToEntity(row));
    }
    /**
     * Run a custom query and map the results
     */
    runQuery(query, params = []) {
        const statement = this.db.prepare(query);
        const rows = statement.all(...params);
        return rows.map(row => this.mapToEntity(row));
    }
    /**
     * Run a custom query that returns a single result
     */
    runQuerySingle(query, params = []) {
        const statement = this.db.prepare(query);
        const row = statement.get(...params);
        return row ? this.mapToEntity(row) : null;
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map