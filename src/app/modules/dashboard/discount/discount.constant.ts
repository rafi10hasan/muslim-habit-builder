
export const BILLING_PLAN = {
  YEARLY_PLAN: "Yearly Plan",
  MONTHLY_PLAN: "Monthly Plan",
  QUARTERLY_PLAN: "Quarterly Plan",
  BIANNUAL_PLAN: "Biannual Plan",
} as const;

export const DISCOUNT_STATUS = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
} as const;
export type DiscountStatus = (typeof DISCOUNT_STATUS)[keyof typeof DISCOUNT_STATUS];

export type BillingPlan = (typeof BILLING_PLAN)[keyof typeof BILLING_PLAN];