/**
 * Per-message pricing — INR.
 *
 * Rates roughly track current Indian-market BSP / aggregator pricing as of
 * 2026 with clean round numbers. They live in one place so changing a rate
 * (or moving them to org settings later) only touches this file.
 *
 *   WhatsApp:
 *     • marketing       ₹1.00   (the user's stated baseline)
 *     • utility         ₹0.20   (transactional alerts, order updates)
 *     • authentication  ₹0.15   (OTPs)
 *     • service         ₹0.00   (free within Meta's 24-hr customer-service window)
 *
 *   SMS:
 *     • transactional   ₹0.18
 *     • promotional     ₹0.25
 *
 *   Email:                ₹0.05
 *   Push (FCM):           ₹0.00
 */

export const CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';

// WhatsApp category → rate. Keys are lowercased to match how templates store
// them (Meta uses uppercase MARKETING/UTILITY/AUTHENTICATION; templates here
// can be either — we normalize before lookup).
const WHATSAPP_RATES: Record<string, number> = {
  marketing: 1.0,
  utility: 0.2,
  authentication: 0.15,
  service: 0.0,
};
const WHATSAPP_DEFAULT = WHATSAPP_RATES.marketing; // safest default: assume marketing rate

const SMS_RATES = {
  transactional: 0.18,
  promotional: 0.25,
};
const SMS_DEFAULT = SMS_RATES.promotional;

const EMAIL_RATE = 0.05;
const FCM_RATE = 0.0;

export type Channel = 'whatsapp' | 'sms' | 'email' | 'fcm';

export interface CostInput {
  channel: Channel;
  /** Template category (whatsapp) or SMS type (transactional / promotional). */
  category?: string | null;
  /** Number of recipients. Defaults to 1. */
  recipientCount?: number;
}

/**
 * Per-message rate in INR for the given channel/category combo. Unknown
 * categories fall back to the channel's default (marketing for WhatsApp,
 * promotional for SMS) so the displayed cost is never lower than reality.
 */
export function rateForMessage({ channel, category }: Omit<CostInput, 'recipientCount'>): number {
  const cat = (category || '').toString().trim().toLowerCase();
  switch (channel) {
    case 'whatsapp':
      return cat in WHATSAPP_RATES ? WHATSAPP_RATES[cat] : WHATSAPP_DEFAULT;
    case 'sms':
      if (cat === 'transactional' || cat === 'utility') return SMS_RATES.transactional;
      if (cat === 'promotional' || cat === 'marketing') return SMS_RATES.promotional;
      return SMS_DEFAULT;
    case 'email':
      return EMAIL_RATE;
    case 'fcm':
      return FCM_RATE;
    default:
      return 0;
  }
}

/** Total estimated cost in INR for the input. */
export function estimateCost(input: CostInput): number {
  const rate = rateForMessage(input);
  const count = Math.max(0, input.recipientCount ?? 1);
  return rate * count;
}

/** Format a number as INR currency: "₹0.20", "₹1.00", "₹1,234.50". */
export function formatINR(amount: number, opts?: { minDecimals?: number; maxDecimals?: number }): string {
  const min = opts?.minDecimals ?? 2;
  const max = opts?.maxDecimals ?? 2;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount || 0);
}

/**
 * Human-readable breakdown to show under the price: "100 marketing × ₹1.00 = ₹100.00".
 * Returns null when the channel has no per-category nuance worth showing.
 */
export function rateBreakdown(input: CostInput): string {
  const { channel, recipientCount = 1 } = input;
  const rate = rateForMessage(input);
  const count = Math.max(0, recipientCount);
  const total = rate * count;

  const labelMap: Record<Channel, string> = {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    email: 'email',
    fcm: 'push',
  };
  const cat = (input.category || '').toString().trim().toLowerCase();
  const catLabel = channel === 'whatsapp' && cat
    ? `${cat} `
    : channel === 'sms' && cat
    ? `${cat} `
    : '';

  return `${count} ${catLabel}${labelMap[channel]}${count === 1 ? '' : 's'} × ${formatINR(rate)} = ${formatINR(total)}`;
}

/** Per-channel rate table — used for tooltips / pricing pages. */
export const RATE_TABLE = {
  whatsapp: WHATSAPP_RATES,
  sms: SMS_RATES,
  email: EMAIL_RATE,
  fcm: FCM_RATE,
};
