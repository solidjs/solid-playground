const formatter = new Intl.NumberFormat("en-US", {
  unit: "millisecond",
  style: "unit",
});

export function formatMs(ms: number) {
  return formatter.format(ms);
}
