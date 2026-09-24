import { RequestContextService } from '../request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('returns null when called outside of run()', () => {
    expect(service.getActorUuid()).toBeNull();
  });

  it('returns the stored actorUuid inside run()', () => {
    const result = service.run({ actorUuid: 'actor-uuid' }, () => service.getActorUuid());

    expect(result).toBe('actor-uuid');
  });

  it('returns null inside run() when the store was seeded with null', () => {
    const result = service.run({ actorUuid: null }, () => service.getActorUuid());

    expect(result).toBeNull();
  });

  it('isolates the store across separate run() calls', () => {
    service.run({ actorUuid: 'first' }, () => {
      expect(service.getActorUuid()).toBe('first');
    });

    expect(service.getActorUuid()).toBeNull();
  });
});
