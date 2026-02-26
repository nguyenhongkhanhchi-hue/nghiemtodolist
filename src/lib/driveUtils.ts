/**
 * Detect if a URL is a Google Drive share link and extract the file ID.
 * Supports formats:
 *   https://drive.google.com/file/d/{ID}/view?usp=sharing
 *   https://drive.google.com/open?id={ID}
 *   https://drive.google.com/uc?id={ID}&export=download
 */
export function extractGDriveFileId(url: string): string | null {
  // Format: /file/d/{ID}/
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Format: ?id={ID}
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  return null;
}

export function isGDriveLink(url: string): boolean {
  return url.includes('drive.google.com') && extractGDriveFileId(url) !== null;
}

/**
 * Convert a Google Drive share link to a direct streamable URL.
 */
export function convertGDriveToDirectUrl(url: string): string {
  const fileId = extractGDriveFileId(url);
  if (!fileId) return url;
  return `https://docs.google.com/uc?export=open&id=${fileId}`;
}

/**
 * Try to generate a reasonable default title from a URL.
 */
export function generateTitleFromUrl(url: string): string {
  if (isGDriveLink(url)) {
    const fileId = extractGDriveFileId(url);
    return `Google Drive - ${fileId?.slice(0, 8) || 'audio'}`;
  }
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || '';
    const decoded = decodeURIComponent(filename);
    return decoded.replace(/\.(mp3|wav|ogg|m4a|aac|flac)$/i, '') || 'Không rõ tên';
  } catch {
    return 'Không rõ tên';
  }
}
