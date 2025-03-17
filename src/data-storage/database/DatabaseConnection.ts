import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class DatabaseConnection {
  private static instance: Database.Database | undefined;
  private static dbPath: string;

  public static initialize(): void {
    // Determine app data directory (platform-specific)
    const userDataPath = app.getPath('userData');
    const dbDirectory = path.join(userDataPath, 'database');
    
    // Create database directory if it doesn't exist
    if (!fs.existsSync(dbDirectory)) {
      fs.mkdirSync(dbDirectory, { recursive: true });
    }
    
    // Set database file path
    this.dbPath = path.join(dbDirectory, 'finance_manager.db');
    
    console.log(`Database path: ${this.dbPath}`);
  }

  public static getInstance(): Database.Database {
    if (!this.instance) {
      if (!this.dbPath) {
        throw new Error('Database not initialized. Call initialize() first.');
      }
      
      try {
        this.instance = new Database(this.dbPath, { 
          verbose: console.log 
        });
        
        // Enable foreign keys support
        this.instance.pragma('foreign_keys = ON');
        
        console.log('Database connection established');
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }
    
    return this.instance;
  }

  public static closeConnection(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = undefined;
      console.log('Database connection closed');
    }
  }
}
