import { format } from 'd3-format';
import { utcFormat } from 'd3-time-format';

export const fmtInt = format(',.0f');
export const fmtDec1 = format(',.1f');
export const fmtDec2 = format(',.2f');
export const fmtPct = format('.0%');
export const fmtPct1 = format('.1%');
export const fmtDate = utcFormat('%-d %b %Y');
export const fmtDateTime = utcFormat('%-d %b %Y, %H:%M UTC');
export const fmtMonth = utcFormat('%b %Y');
export const fmtYear = utcFormat('%Y');

/** Compact number for axes / cards: 1.2k, 70.8k, 1.5M */
export function fmtCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return format('.3~s')(v).replace('M', 'M');
  if (a >= 1e4) return format('.3~s')(v);
  if (a >= 100) return fmtInt(v);
  if (a >= 10) return format(',.1~f')(v);
  return format(',.2~f')(v);
}

/** Value formatting that adapts to magnitude: whole numbers for counts, decimals for small averages. */
export function fmtValue(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return fmtInt(v);
  if (a >= 100) return format(',.1~f')(v);
  if (a >= 1) return format(',.2~f')(v);
  if (a === 0) return '0';
  return format(',.3~f')(v);
}

export function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 24 * 60)} min`;
  if (d < 2) return `${fmtDec1(d)} day`;
  if (d < 100) return `${fmtDec1(d)} days`;
  return `${fmtInt(d)} days`;
}

export function fmtYears(days: number): string {
  return `${fmtDec1(days / 365.25)} years`;
}
