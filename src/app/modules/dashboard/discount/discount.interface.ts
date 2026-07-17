import { BillingPlan } from "./discount.constant";
import { DiscountStatus } from "./discount.constant";



export interface IDiscount extends Document{
    
code: string;

discount: number;

discountString: string;

appliesTo: BillingPlan;

usageLimit: number;

totalUsage: number;

totalDiscountGiven: number;

validFrom: Date | null;

validUntil: Date | null;

status: DiscountStatus;

createdAt: Date;

updatedAt: Date;

}