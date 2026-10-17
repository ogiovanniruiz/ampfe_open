// Billing rates shared by Organization Billing and Campaign Billing

export const SUBSCRIPTION_COST: {[tier: string]: number} = {
  PLUS: 600,
  CORE: 400,
  LITE: 200,
  FREE: 0,
};

// Orgs with an unrecognized tier are billed as PLUS, matching the original default
export function subscriptionCost(subscription: string): number {
  return SUBSCRIPTION_COST[subscription] ?? SUBSCRIPTION_COST.PLUS;
}

export interface UsageLine {
  count: number;
  cost: number;
}

export interface TwilioCharges {
  calls: UsageLine;
  numbers: UsageLine;
  messages: UsageLine;
}

export interface SWCharges {
  messages: UsageLine;
  calls: UsageLine;
  numbers: UsageLine;
}

// $0.06 per call minute, $0.04 per text segment, $2 per pool number
// Display only: the charge formulas below are kept as-is so rounding never changes
export const BILLING_RATES = {
  callMinute: 0.06,
  textSegment: 0.04,
  poolNumber: 2,
};

export function twilioCharges(result: any): TwilioCharges {
  const callCount = Number(result['callCount'])
  const numberCount = Number(result['phonenums'])
  const messageCount = Number(result['smsCount']) + Number(result['mmsCount'])

  return {
    calls: {count: callCount, cost: Math.round(callCount*6)/100},
    numbers: {count: numberCount, cost: Math.round(numberCount*2)},
    messages: {count: messageCount, cost: Math.round(messageCount*4)/100},
  }
}

export function swCharges(result: any): SWCharges {
  const messageCount = Number(result['numSegments']) + Number(result['numMedia'])
  const callCount = Math.round(Number(result['callCount']))
  const numberCount = Math.round(Number(result['phonenums']))

  return {
    messages: {count: messageCount, cost: Math.round(messageCount*4)/100},
    calls: {count: callCount, cost: Math.round(callCount*6)/100},
    numbers: {count: numberCount, cost: Math.round(numberCount*2)},
  }
}

export function formatBillingDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
