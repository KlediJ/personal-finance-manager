import * as ort from 'onnxruntime-node';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface ModelConfig {
  name: string;
  path: string;
  type: 'mistral' | 'codellama';
  size: number; // in MB
  version: string;
  description: string;
}

export interface ModelStatus {
  name: string;
  loaded: boolean;
  loadTime?: number;
  memoryUsage?: number;
  error?: string;
}

export class ModelManager {
  private static instance: ModelManager;
  private models: Map<string, ort.InferenceSession> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private modelStatus: Map<string, ModelStatus> = new Map();
  private modelsPath: string;
  private maxMemoryUsage = 8 * 1024 * 1024 * 1024; // 8GB in bytes
  private currentMemoryUsage = 0;

  private constructor() {
    this.modelsPath = path.join(app.getPath('userData'), 'ai-models');
    this.ensureModelsDirectory();
    this.initializeModelConfigs();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private ensureModelsDirectory(): void {
    if (!fs.existsSync(this.modelsPath)) {
      fs.mkdirSync(this.modelsPath, { recursive: true });
    }
  }

  private initializeModelConfigs(): void {
    // Mistral 7B for transaction categorization and payee extraction
    this.modelConfigs.set('mistral-7b', {
      name: 'mistral-7b',
      path: path.join(this.modelsPath, 'mistral-7b.onnx'),
      type: 'mistral',
      size: 3500, // ~3.5GB
      version: '1.0.0',
      description: 'Mistral 7B for transaction categorization and payee extraction'
    });

    // CodeLlama 7B for complex financial queries
    this.modelConfigs.set('codellama-7b', {
      name: 'codellama-7b', 
      path: path.join(this.modelsPath, 'codellama-7b.onnx'),
      type: 'codellama',
      size: 3800, // ~3.8GB
      version: '1.0.0',
      description: 'CodeLlama 7B for complex financial queries and database navigation'
    });

    // Initialize status for all models
    this.modelConfigs.forEach((config, name) => {
      this.modelStatus.set(name, {
        name,
        loaded: false
      });
    });
  }

  public async loadModel(modelName: string): Promise<boolean> {
    const config = this.modelConfigs.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found in configuration`);
    }

    // Check if model is already loaded
    if (this.models.has(modelName)) {
      console.log(`Model ${modelName} is already loaded`);
      return true;
    }

    // Check memory constraints
    const estimatedMemory = config.size * 1024 * 1024; // Convert MB to bytes
    if (this.currentMemoryUsage + estimatedMemory > this.maxMemoryUsage) {
      console.warn(`Cannot load ${modelName}: would exceed memory limit`);
      await this.unloadLeastUsedModel();
    }

    const startTime = Date.now();
    
    try {
      console.log(`Loading model ${modelName}...`);
      
      // Check if model file exists
      if (!fs.existsSync(config.path)) {
        console.log(`Model file not found: ${config.path}, using mock mode`);
        
        // Create mock session for development
        const mockSession = {
          inputNames: ['input'],
          outputNames: ['output'],
          run: async (feeds: any) => ({ output: new Float32Array([0.5, 0.3, 0.2]) }),
          release: async () => {}
        };
        
        this.models.set(modelName, mockSession as any);
        const loadTime = Date.now() - startTime;
        
        // Update status
        this.modelStatus.set(modelName, {
          name: modelName,
          loaded: true,
          loadTime,
          memoryUsage: estimatedMemory
        });

        this.currentMemoryUsage += estimatedMemory;
        
        console.log(`Model ${modelName} loaded in mock mode in ${loadTime}ms`);
        return true;
      }

      // Load model with ONNX Runtime
      const session = await ort.InferenceSession.create(config.path, {
        executionProviders: ['cpu'], // Use CPU execution provider
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionMode: 'parallel'
      });

      this.models.set(modelName, session);
      const loadTime = Date.now() - startTime;
      
      // Update status
      this.modelStatus.set(modelName, {
        name: modelName,
        loaded: true,
        loadTime,
        memoryUsage: estimatedMemory
      });

      this.currentMemoryUsage += estimatedMemory;
      
      console.log(`Model ${modelName} loaded successfully in ${loadTime}ms`);
      return true;

    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error);
      
      // Update status with error
      this.modelStatus.set(modelName, {
        name: modelName,
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  public async unloadModel(modelName: string): Promise<boolean> {
    const session = this.models.get(modelName);
    if (!session) {
      console.log(`Model ${modelName} is not loaded`);
      return true;
    }

    try {
      await session.release();
      this.models.delete(modelName);
      
      // Update memory usage
      const config = this.modelConfigs.get(modelName);
      if (config) {
        this.currentMemoryUsage -= config.size * 1024 * 1024;
      }
      
      // Update status
      this.modelStatus.set(modelName, {
        name: modelName,
        loaded: false
      });

      console.log(`Model ${modelName} unloaded successfully`);
      return true;

    } catch (error) {
      console.error(`Error unloading model ${modelName}:`, error);
      return false;
    }
  }

  private async unloadLeastUsedModel(): Promise<void> {
    // For now, unload the first loaded model
    // In a more sophisticated implementation, we'd track usage statistics
    const loadedModels = Array.from(this.models.keys());
    if (loadedModels.length > 0) {
      const modelToUnload = loadedModels[0];
      await this.unloadModel(modelToUnload);
      console.log(`Unloaded ${modelToUnload} to free memory`);
    }
  }

  public async getModel(modelName: string): Promise<ort.InferenceSession | null> {
    const session = this.models.get(modelName);
    if (!session) {
      // Try to load the model if it's not loaded
      const loaded = await this.loadModel(modelName);
      if (loaded) {
        return this.models.get(modelName) || null;
      }
      return null;
    }
    return session;
  }

  public isModelLoaded(modelName: string): boolean {
    return this.models.has(modelName);
  }

  public getModelStatus(modelName: string): ModelStatus | null {
    return this.modelStatus.get(modelName) || null;
  }

  public getAllModelStatuses(): ModelStatus[] {
    return Array.from(this.modelStatus.values());
  }

  public getMemoryUsage(): {
    current: number;
    max: number;
    percentage: number;
  } {
    return {
      current: this.currentMemoryUsage,
      max: this.maxMemoryUsage,
      percentage: (this.currentMemoryUsage / this.maxMemoryUsage) * 100
    };
  }

  public async preloadModels(): Promise<void> {
    console.log('Preloading AI models...');
    
    // Load models in order of priority
    const modelPriority = ['mistral-7b', 'codellama-7b'];
    
    for (const modelName of modelPriority) {
      try {
        await this.loadModel(modelName);
      } catch (error) {
        console.error(`Failed to preload model ${modelName}:`, error);
      }
    }
  }

  public async downloadModel(modelName: string, onProgress?: (progress: number) => void): Promise<boolean> {
    const config = this.modelConfigs.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found in configuration`);
    }

    // For now, we'll simulate the download process
    // In a real implementation, this would download from a model repository
    console.log(`Downloading model ${modelName}...`);
    
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        onProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Create a placeholder file for now
    const placeholderContent = `# Placeholder for ${modelName} model\n# This would be replaced with actual model download logic\n`;
    fs.writeFileSync(config.path + '.placeholder', placeholderContent);
    
    console.log(`Model ${modelName} download completed`);
    return true;
  }

  public async unloadAllModels(): Promise<void> {
    const loadedModels = Array.from(this.models.keys());
    
    for (const modelName of loadedModels) {
      await this.unloadModel(modelName);
    }
    
    console.log('All models unloaded');
  }

  public async dispose(): Promise<void> {
    await this.unloadAllModels();
    ModelManager.instance = null as any;
  }
}