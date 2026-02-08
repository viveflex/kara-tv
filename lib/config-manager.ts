import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface Config {
  youtube: {
    apiKeys: string[];
  };
  server: {
    apiPort: number;
    wsPort: number;
  };
  app: {
    name: string;
    version: string;
  };
  search?: {
    maxResults?: number;
    includeUnembeddable?: boolean;
  };
  library?: {
    autoSaveThreshold: number;
    maxTempVideos: number;
    tempPath: string;
    savedPath: string;
  };
}

class ConfigManager {
  private config: Config | null = null;
  private currentKeyIndex = 0;

  loadConfig(): Config {
    if (this.config) return this.config;

    const configPath = path.join(process.cwd(), 'config.yml');
    
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents) as Config;
      
      if (!this.config.youtube?.apiKeys || this.config.youtube.apiKeys.length === 0) {
        throw new Error('No YouTube API keys found in config.yml');
      }
      
      console.log(`Loaded ${this.config.youtube.apiKeys.length} YouTube API key(s)`);
      return this.config;
    } catch (error) {
      console.error('Failed to load config.yml:', error);
      throw error;
    }
  }

  getYouTubeApiKey(): string {
    if (!this.config) {
      this.loadConfig();
    }

    const keys = this.config!.youtube.apiKeys;
    const key = keys[this.currentKeyIndex];
    
    // Rotate to next key for next request (round-robin)
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
    
    return key;
  }

  getAllYouTubeApiKeys(): string[] {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!.youtube.apiKeys;
  }

  getConfig(): Config {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Export convenience function
export function getConfig(): Config {
  return configManager.getConfig();
}
