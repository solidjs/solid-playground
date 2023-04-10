export const clampPercentage = (percentage: number, lowerBound: number, upperBound: number) => {
  return Math.min(Math.max(percentage, lowerBound), upperBound);
};
