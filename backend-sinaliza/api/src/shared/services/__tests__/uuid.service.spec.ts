import { validate as isUuid, version as uuidVersion } from 'uuid';

import { UuidService } from '../uuid.service';

describe('UuidService', () => {
  const service = new UuidService();

  it('generates a v7 uuid by default', () => {
    const uuid = service.generate();

    expect(isUuid(uuid)).toBe(true);
    expect(uuidVersion(uuid)).toBe(7);
  });

  it('generates a v4 uuid when explicitly requested', () => {
    const uuid = service.generate('v4');

    expect(isUuid(uuid)).toBe(true);
    expect(uuidVersion(uuid)).toBe(4);
  });

  it('generates a v7 uuid when explicitly requested', () => {
    const uuid = service.generate('v7');

    expect(isUuid(uuid)).toBe(true);
    expect(uuidVersion(uuid)).toBe(7);
  });
});
