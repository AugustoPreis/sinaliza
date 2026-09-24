const IMAGE_MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Maps a common image mimetype to its file extension, or `undefined` if unsupported. */
export function getExtensionFromMimeType(mimeType: string): string | undefined {
  return IMAGE_MIME_TYPE_EXTENSIONS[mimeType];
}
