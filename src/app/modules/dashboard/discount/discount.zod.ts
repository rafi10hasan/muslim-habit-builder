
import z from "zod";
import { BILLING_PLAN } from "./discount.constant";

/*
export interface IDiscount extends Document{
    
code: string;

discount: string;

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

*/
export const discountSchema = z.object({

    code: z.string().nonempty("Code is required"),

    discount: z.coerce.number().positive("Discount must be a positive number"),

    appliesTo: z.enum(Object.values(BILLING_PLAN), {
        error: () => ({ message: "Invalid appliesTo value" }),
    }),

    usageLimit: z.coerce.number().int().positive("Usage limit must be a positive integer"),

    validFrom: z.coerce.date({ error: () => "Invalid date format for validFrom" }),

    validUntil: z.coerce.date({ error: () => "Invalid date format for validUntil" })
}).superRefine((data, ctx) => {
    if (data.validFrom && data.validUntil && data.validFrom > data.validUntil) {
        ctx.addIssue({
            code: "custom",
            message: "validFrom must be less than or equal to validUntil",
        });
    }
});


export const updateDiscountSchema = z.object({

    code: z.string().nonempty("Code is required").optional(),

    discount: z.coerce.number().positive("Discount must be a positive number").optional(),

    appliesTo: z.enum(Object.values(BILLING_PLAN), {
        error: () => ({ message: "Invalid appliesTo value" }),
    }).optional(),

    usageLimit: z.coerce.number().int().positive("Usage limit must be a positive integer").optional(),

    validFrom: z.coerce.date({ error: () => "Invalid date format for validFrom" }).optional(),

    validUntil: z.coerce.date({ error: () => "Invalid date format for validUntil" }).optional()
}).superRefine((data, ctx) => {
    if (data.validFrom && data.validUntil && data.validFrom > data.validUntil) {
        ctx.addIssue({
            code: "custom",
            message: "validFrom must be less than or equal to validUntil",
        });
    }

    if (Object.keys(data).length === 0) {
        ctx.addIssue({
            code: "custom",
            message: "At least one field must be provided for update",
        });
    }
});

export type TDiscountPayload = z.infer<
    typeof discountSchema
>;

export type TUpdateDiscountPayload = z.infer<
    typeof updateDiscountSchema
>;

const discountValidationZodSchema = {
    discountSchema,
    updateDiscountSchema
};

export default discountValidationZodSchema;