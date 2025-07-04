import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { NaiveBayesCategorizer, ModelData } from './NaiveBayesCategorizer';

export class AutoCategorizer {
  private static instance: AutoCategorizer;
  private model: NaiveBayesCategorizer | null = null;
  private modelPath: string;

  private constructor() {
    this.modelPath = path.join(app.getPath('userData'), 'category-model.json');
    this.loadModel();
  }

  static getInstance(): AutoCategorizer {
    if (!this.instance) {
      this.instance = new AutoCategorizer();
    }
    return this.instance;
  }

  private loadModel(): void {
    if (fs.existsSync(this.modelPath)) {
      const raw = fs.readFileSync(this.modelPath, 'utf-8');
      const data = JSON.parse(raw) as ModelData;
      this.model = NaiveBayesCategorizer.fromJSON(data);
    }
  }

  predict(text: string): { label: string; probability: number } | null {
    if (!this.model) return null;
    return this.model.predict(text);
  }
}
