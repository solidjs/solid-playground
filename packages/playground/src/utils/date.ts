const formatter = new Intl.RelativeTimeFormat('en');
export const timeAgo = (ms: number): string => {
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const month = Math.round(day / 30);
  const year = Math.round(month / 12);
  if (sec < 10) {
    return 'just now';
  } else if (sec < 45) {
    return formatter.format(-sec, 'second');
  } else if (sec < 90 || min < 45) {
    return formatter.format(-min, 'minute');
  } else if (min < 90 || hr < 24) {
    return formatter.format(-hr, 'hour');
  } else if (hr < 36 || day < 30) {
    return formatter.format(-day, 'day');
  } else if (month < 18) {
    return formatter.format(-month, 'month');
  } else {
    return formatter.format(-year, 'year');
  }
};
