const map: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export class TimeUnitHelper {
  static durationToSeconds(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);

    return (map[unit] ?? map.d) * value;
  }
}
