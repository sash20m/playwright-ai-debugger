import path from 'path';
import { ConfigService } from './ConfigService';

/**
 * Creates a singleton for the ConfigService used all throughout the cli.
 */
const config = new ConfigService();

export default config;
