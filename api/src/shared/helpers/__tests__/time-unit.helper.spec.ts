import { TimeUnitHelper } from '../time-unit.helper';

describe('TimeUnitHelper.durationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('parses "%s" as %d seconds', (duration, expected) => {
    expect(TimeUnitHelper.durationToSeconds(duration)).toBe(expected);
  });

  it('falls back to days when the unit suffix is not recognized', () => {
    expect(TimeUnitHelper.durationToSeconds('5x')).toBe(5 * 86400);
  });

  it('returns NaN for a value that is not numeric (no format validation)', () => {
    expect(TimeUnitHelper.durationToSeconds('abc')).toBeNaN();
  });
});
