/**
 * 相对时间格式化工具
 * 将 ISO 时间字符串转换为人类可读的相对时间描述
 */

export function formatRelativeTime(isoString: string): string {
  const now: number = Date.now();
  const target: number = new Date(isoString).getTime();
  const diffMs: number = now - target;
  const diffSec: number = Math.floor(diffMs / 1000);
  const diffMin: number = Math.floor(diffSec / 60);
  const diffHour: number = Math.floor(diffMin / 60);
  const diffDay: number = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return '刚刚';
  }
  if (diffMin < 60) {
    return `${diffMin}分钟前`;
  }
  if (diffHour < 24) {
    return `${diffHour}小时前`;
  }
  if (diffDay === 1) {
    return '昨天';
  }
  if (diffDay < 7) {
    return `${diffDay}天前`;
  }

  const date: Date = new Date(target);
  const month: number = date.getMonth() + 1;
  const day: number = date.getDate();
  const thisYear: number = new Date(now).getFullYear();
  const targetYear: number = date.getFullYear();

  if (thisYear === targetYear) {
    return `${month}月${day}日`;
  }
  return `${targetYear}/${month}/${day}`;
}
