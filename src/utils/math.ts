export function mod(n: number, m: number): number {
  return (n % m + m) % m;
}

export function toRadians(degree: number): number {
  return degree * (Math.PI / 180);
}

export function round(n: number, places = 1): number {
  const base = 10 ** places;
  return Math.round(n * base) / base;
}
