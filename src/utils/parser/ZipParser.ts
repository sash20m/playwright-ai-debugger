import * as path from 'path';
import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs/promises';
import { CliError } from '../../errors';

/**
 * ZipParser unzips a .zip file to a temporary location.
 */
export class ZipParser {
  /**
   * @returns name of the temporary folder
   */
  static async unzipToTemp(zipPath: string): Promise<string> {
    const tmp = await mkdtemp(path.join(tmpdir(), path.basename(zipPath, '.zip')));
    try {
      new AdmZip(zipPath).extractAllTo(tmp, true);
      return tmp;
    } catch (e: any) {
      throw new CliError(`Failed to unzip "${zipPath}": ${e.message || e}`, 4);
    }
  }
}
