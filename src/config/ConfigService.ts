/**
 * Service for loading, caching, and updating configuration values from a JSON file.
 */
import fs from 'fs/promises';
import { Config } from './types';
import { ValidationError } from '../errors';
import path from 'path';

const CONFIG_DIR = path.join(__dirname, '.config-keys');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigService {
  private cache: Partial<Config> = {};
  /**
   * Loads the configuration from disk into memory, or returns an empty config if not found.
   * @returns {Promise<Config>} The loaded configuration object.
   */
  async load(): Promise<Config> {
    try {
      const raw = await fs.readFile(CONFIG_FILE, 'utf8');
      this.cache = JSON.parse(raw);
    } catch {
      this.cache = {};
    }
    return this.cache as Config;
  }

  /**
   * Retrieves a configuration value by key, loading from disk if necessary.
   * @param key The configuration key to retrieve.
   * @returns {Promise<Config[K] | undefined>} The value for the given key, or undefined if not set.
   */
  async get<K extends keyof Config>(key: K): Promise<Config[K] | undefined> {
    if (!key) throw new ValidationError('Invalid get config key');
    await this.load();
    return this.cache[key];
  }

  /**
   * Sets a configuration value and persists it to disk.
   * @param key The configuration key to set.
   * @param value The value to set for the key.
   * @returns {Promise<void>}
   */
  async set<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    if (!key) throw new ValidationError('Invalid set config key');
    try {
      await this.load();
      this.cache[key] = value;
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      throw new ValidationError('Failed to load config. ' + e);
    }
  }
}
