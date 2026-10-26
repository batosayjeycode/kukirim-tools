/**
 * Build-time lookup for files in public/downloads/. Used in page frontmatter
 * (Node only) so a download is only advertised when the file exists.
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {number} bytes
 * @returns {string} e.g. "27 KB", "1,2 MB"
 */
export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * @param {string} filename file name inside public/downloads/
 * @param {string} [root] project root (defaults to the build's working directory)
 * @returns {{ href: string, size: string } | null} null when the file is missing
 */
export function getDownload(filename, root = process.cwd()) {
  if (!/^[\w.-]+$/.test(filename)) return null;
  try {
    const stat = statSync(join(root, 'public', 'downloads', filename));
    return stat.isFile() ? { href: `/downloads/${filename}`, size: formatFileSize(stat.size) } : null;
  } catch {
    return null;
  }
}
