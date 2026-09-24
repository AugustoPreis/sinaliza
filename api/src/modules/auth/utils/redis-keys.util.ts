export function getRefreshTokenRedisKey(uuid: string): string {
  return `auth:refresh:${uuid}`;
}

export function getPasswordResetRedisKey(uuid: string): string {
  return `auth:password-reset:${uuid}`;
}
