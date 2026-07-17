import { model, Schema } from "mongoose";

import { BILLING_PLAN, DISCOUNT_STATUS } from "./discount.constant";
import { IDiscount } from "./discount.interface";

/*

export interface IDiscount extends Document{
    
code: string;

discount: string;

discountString: string;

appliesTo: BillingPlan;

usageLimit: number;

validFrom: Date | null;

validUntil: Date | null;

status: DiscountStatus;

createdAt: Date;

updatedAt: Date;

}

*/

const discountSchema = new Schema<IDiscount>({
 
    code: {
        type: String,
        required: true,
        index: true
    },
    discount: {
        type: Number,
        required: true,
    },
    discountString: {
        type: String,
        required: true,
    },
    appliesTo: {
        type: String,
        enum: Object.values(BILLING_PLAN),
        required: true,
    },
    usageLimit: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(DISCOUNT_STATUS),
        default: DISCOUNT_STATUS.ACTIVE
    },
    validFrom: {
        type: Date,
        required: true,
        default: null,
    },
    validUntil: {
        type: Date,
        required: true,
        default: null,
    },
  
},
{
    timestamps: true,
    versionKey: false
}

);

export const Discount = model<IDiscount>('Discount', discountSchema);

/*


export interface IAnnouncement extends Document{
    
title: string;

description: string;

startedAt: Date | null;

endedAt: Date | null;

status: string | null;

createdAt: Date;

updatedAt: Date;

}

*/