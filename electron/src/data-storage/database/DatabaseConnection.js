"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
class DatabaseConnection {
    static initialize() {
        // Determine app data directory (platform-specific)
        const userDataPath = electron_1.app.getPath('userData');
        const dbDirectory = path_1.default.join(userDataPath, 'database');
        // Create database directory if it doesn't exist
        if (!fs_1.default.existsSync(dbDirectory)) {
            fs_1.default.mkdirSync(dbDirectory, { recursive: true });
        }
        // Set database file path
        this.dbPath = path_1.default.join(dbDirectory, 'finance_manager.db');
        if (this.isDevelopment) {
            console.log(`Database path: ${this.dbPath}`);
        }
    }
    static getInstance() {
        if (!this.instance) {
            if (!this.dbPath) {
                throw new Error('Database not initialized. Call initialize() first.');
            }
            try {
                this.instance = new better_sqlite3_1.default(this.dbPath, {
                    verbose: this.isDevelopment ? console.log : undefined
                });
                // Enable foreign keys support
                this.instance.pragma('foreign_keys = ON');
                if (this.isDevelopment) {
                    console.log('Database connection established');
                }
            }
            catch (error) {
                console.error('Failed to connect to database:', error);
                throw error;
            }
        }
        return this.instance;
    }
    static closeConnection() {
        if (this.instance) {
            this.instance.close();
            this.instance = undefined;
            if (this.isDevelopment) {
                console.log('Database connection closed');
            }
        }
    }
}
exports.DatabaseConnection = DatabaseConnection;
DatabaseConnection.isDevelopment = process.env.NODE_ENV === 'development';
