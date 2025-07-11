"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
const ort = __importStar(require("onnxruntime-node"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ModelManager {
    constructor() {
        this.models = new Map();
        this.modelConfigs = new Map();
        this.modelStatus = new Map();
        this.maxMemoryUsage = 8 * 1024 * 1024 * 1024; // 8GB in bytes
        this.currentMemoryUsage = 0;
        this.modelsPath = path.join(electron_1.app.getPath('userData'), 'ai-models');
        this.ensureModelsDirectory();
        this.initializeModelConfigs();
    }
    static getInstance() {
        if (!ModelManager.instance) {
            ModelManager.instance = new ModelManager();
        }
        return ModelManager.instance;
    }
    ensureModelsDirectory() {
        if (!fs.existsSync(this.modelsPath)) {
            fs.mkdirSync(this.modelsPath, { recursive: true });
        }
    }
    initializeModelConfigs() {
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
    async loadModel(modelName) {
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
                    run: async (feeds) => ({ output: new Float32Array([0.5, 0.3, 0.2]) }),
                    release: async () => { }
                };
                this.models.set(modelName, mockSession);
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
        }
        catch (error) {
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
    async unloadModel(modelName) {
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
        }
        catch (error) {
            console.error(`Error unloading model ${modelName}:`, error);
            return false;
        }
    }
    async unloadLeastUsedModel() {
        // For now, unload the first loaded model
        // In a more sophisticated implementation, we'd track usage statistics
        const loadedModels = Array.from(this.models.keys());
        if (loadedModels.length > 0) {
            const modelToUnload = loadedModels[0];
            await this.unloadModel(modelToUnload);
            console.log(`Unloaded ${modelToUnload} to free memory`);
        }
    }
    async getModel(modelName) {
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
    isModelLoaded(modelName) {
        return this.models.has(modelName);
    }
    getModelStatus(modelName) {
        return this.modelStatus.get(modelName) || null;
    }
    getAllModelStatuses() {
        return Array.from(this.modelStatus.values());
    }
    getMemoryUsage() {
        return {
            current: this.currentMemoryUsage,
            max: this.maxMemoryUsage,
            percentage: (this.currentMemoryUsage / this.maxMemoryUsage) * 100
        };
    }
    async preloadModels() {
        console.log('Preloading AI models...');
        // Load models in order of priority
        const modelPriority = ['mistral-7b', 'codellama-7b'];
        for (const modelName of modelPriority) {
            try {
                await this.loadModel(modelName);
            }
            catch (error) {
                console.error(`Failed to preload model ${modelName}:`, error);
            }
        }
    }
    async downloadModel(modelName, onProgress) {
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
    async unloadAllModels() {
        const loadedModels = Array.from(this.models.keys());
        for (const modelName of loadedModels) {
            await this.unloadModel(modelName);
        }
        console.log('All models unloaded');
    }
    async dispose() {
        await this.unloadAllModels();
        ModelManager.instance = null;
    }
}
exports.ModelManager = ModelManager;
//# sourceMappingURL=ModelManager.js.map