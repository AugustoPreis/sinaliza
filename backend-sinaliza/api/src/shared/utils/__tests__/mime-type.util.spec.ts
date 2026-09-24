import { getExtensionFromMimeType } from '../mime-type.util';

describe('getExtensionFromMimeType', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('maps %s to %s', (mimeType, extension) => {
    expect(getExtensionFromMimeType(mimeType)).toBe(extension);
  });

  it('returns undefined for an unsupported mimetype', () => {
    expect(getExtensionFromMimeType('application/pdf')).toBeUndefined();
  });
});
