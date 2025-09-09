export const toCents = async (v: number | string) => {
  return Math.round(Number(v) * 100);
};

export const fmtUSD = async (cents: number) => {
  return (cents / 100).toFixed(2);
};
