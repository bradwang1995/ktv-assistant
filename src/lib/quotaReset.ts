const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export function formatRelativeQuotaReset(resetAt: string, now = Date.now()) {
  const resetTime = Date.parse(resetAt);

  if (!Number.isFinite(resetTime)) {
    return "本地重置时间暂不可用";
  }

  const remainingMilliseconds = resetTime - now;

  if (remainingMilliseconds <= 0) {
    return "本地重置即将开始";
  }

  const remainingHours = Math.ceil(remainingMilliseconds / MILLISECONDS_PER_HOUR);
  return `本地重置还有 ${remainingHours} 小时`;
}
