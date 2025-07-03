import fs from 'fs/promises';
import path from 'path';
import { ConfigService } from '../ConfigService';
import { Config } from '../types';

jest.mock('fs/promises');

const FIXTURE_CONFIG_DIR = path.join(__dirname, '..', '.config-keys');
const FIXTURE_CONFIG_FILE = path.join(FIXTURE_CONFIG_DIR, 'config.json');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockData: Partial<Config>;

  beforeEach(() => {
    configService = new ConfigService();

    mockData = { openaiKey: 'openai_test_key' };

    (fs.readFile as jest.Mock).mockReset();
    (fs.writeFile as jest.Mock).mockReset();
    (fs.mkdir as jest.Mock).mockReset();
  });

  it('loads config from file if present', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
    const config = await configService.load();
    expect(config).toStrictEqual({
      openaiKey: 'openai_test_key',
    });
  });

  it('returns empty config if file is missing or invalid', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('not found'));
    await configService.load();
    expect(fs.readFile).toHaveBeenCalledWith(FIXTURE_CONFIG_FILE, 'utf8');
  });

  it('get returns the correct value for a key', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
    const value = await configService.get('openaiKey');
    expect(fs.readFile).toHaveBeenCalledWith(FIXTURE_CONFIG_FILE, 'utf8');
    expect(value).toBe(mockData.openaiKey);
  });

  it('get returns undefined for missing key', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
    const value = await configService.get('openaiKey');
    expect(fs.readFile).toHaveBeenCalledWith(FIXTURE_CONFIG_FILE, 'utf8');
    expect(value).toBe(undefined);
  });

  it('set updates the config and writes to file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    await configService.set('openaiKey', 'new-key');
    expect(fs.mkdir).toHaveBeenCalledWith(FIXTURE_CONFIG_DIR, { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(FIXTURE_CONFIG_FILE, JSON.stringify({ openaiKey: 'new-key' }, null, 2));
  });

  it('set preserves existing keys', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ anthropicKey: 'anthro' }));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    await configService.set('openaiKey', 'openai');
    expect(fs.writeFile).toHaveBeenCalledWith(
      FIXTURE_CONFIG_FILE,
      JSON.stringify({ anthropicKey: 'anthro', openaiKey: 'openai' }, null, 2)
    );
  });
});
