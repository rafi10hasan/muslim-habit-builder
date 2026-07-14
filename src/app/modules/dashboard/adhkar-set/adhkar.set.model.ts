import { Schema, model } from 'mongoose';
import { CONNECTED_PRAYERS } from '../../../../interfaces';
import { ADHKAR_TYPES } from './adhkar.set.constant';
import { IAdhkarSet } from './adhkar.set.interface';

// adhkar set schema
const adhkarItemSchema = new Schema({
    itemId: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    arabic: { type: String, required: true },
    transliteration: { type: String, required: true },
    translation: { type: String, required: true },
    virtue: { type: String, trim: true },
    reference: { type: String, trim: true },
    count: { type: Number, default: null },
    order: { type: Number, required: true },
});


const adhkarSetSchema = new Schema<IAdhkarSet>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        nameArabic: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: Object.values(ADHKAR_TYPES),
            required: true,
        },
        connectedPrayer: {
            type: String,
            enum: Object.values(CONNECTED_PRAYERS),
            default: null,
        },
        totalCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        items: [adhkarItemSchema],
    },
    {
        timestamps: true,
    }
);

export const AdhkarSet = model<IAdhkarSet>('AdhkarSet', adhkarSetSchema);