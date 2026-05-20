import { Schema, model } from 'mongoose';
import { CONNECTED_PRAYERS, HABIT_CATEGORIES, HABIT_LEVELS } from '../../../interfaces';
import { FREQUENCIES, HABIT_TYPES } from './system.habit.constant';
import { IHabitTemplate } from './system.habit.interface';




// Main Schema
const habitTemplateSchema = new Schema<IHabitTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: Object.values(HABIT_CATEGORIES),
      required: true
    },

    connectedPrayer: {
      type: String,
      enum: Object.values(CONNECTED_PRAYERS),
      default: null
    },

    habitType: {
      type: String,
      enum: Object.values(HABIT_TYPES),
      required: true
    },

    supportsLocation: {
      type: Boolean,
      default: false
    },

    parent: {
      type: Schema.Types.ObjectId,
      ref: 'HabitTemplate',
      default: null
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'HabitTemplate',
      default: null
    },

    defaultFrequency: {
      type: String,
      enum: Object.values(FREQUENCIES),
      required: true,
      default: FREQUENCIES.DAILY
    },

    allowedFrequencies: {
      type: [String],
      enum: Object.values(FREQUENCIES),
      required: true
    },

    level: {
      type: String,
      enum: Object.values(HABIT_LEVELS),
      required: true
    },

    isLocked: {
      type: Boolean,
      default: false
    },

    connectedHabits: {
      type: [{
        templateHabit: { type: Schema.Types.ObjectId, ref: 'HabitTemplate', required: false },
        order: { type: Number, required: true },
      }],
      default: [],
    },

    adhkarSet: {
      type: Schema.Types.ObjectId,
      ref: 'AdhkarSet',
      default: null
    },

    quranContent: {
      type: Schema.Types.ObjectId,
      ref: 'QuranContent',
      default: null
    },

    infoContent: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },

  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexing (Optional, but recommended for performance)
habitTemplateSchema.index({ category: 1, habitType: 1 });
habitTemplateSchema.index({ level: 1, levelOrder: 1 });

export const HabitTemplate = model<IHabitTemplate>('HabitTemplate', habitTemplateSchema);