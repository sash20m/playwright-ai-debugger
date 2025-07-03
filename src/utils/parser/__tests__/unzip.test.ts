import * as fs from 'fs/promises';
import * as path from 'path';
import { ZipParser } from '../ZipParser';

describe('unzipToTemp', () => {
  it('unpacks zip file into temp dir and contains expected files', async () => {
    const zipPath = path.join(__dirname, 'fixtures/test.zip');
    const outputPath = await ZipParser.unzipToTemp(zipPath);
    const files = await fs.readdir(outputPath);

    expect(files).toContain('0-trace.network');
    expect(files).toContain('0-trace.stacks');
    expect(files).toContain('0-trace.trace');
    expect(files).toContain('test.trace');
  });

  it('throws error for invalid zip file', async () => {
    const invalidZipPath = path.join(__dirname, 'fixtures/not-a-zip.txt');
    await expect(ZipParser.unzipToTemp(invalidZipPath)).rejects.toThrow(/Failed to unzip/);
  });
});
