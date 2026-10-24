export function calculateEmi(
  principal: number,
  annualRate: number,
  months: number,
) {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRate) ||
    !Number.isFinite(months) ||
    principal < 0 ||
    annualRate < 0 ||
    months <= 0
  )
    return 0;
  const rate = annualRate / 1200;
  return rate === 0
    ? principal / months
    : (principal * rate) / (1 - Math.pow(1 + rate, -months));
}
