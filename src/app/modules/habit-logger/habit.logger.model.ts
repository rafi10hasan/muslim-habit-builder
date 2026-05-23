import { model, Schema } from "mongoose";

import { IHabitLog } from "./habit.logger.interface";
import { LOG_STATUS } from "./habit.logger.constant";



const habitLogSchema = new Schema<IHabitLog>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    userHabit: {
        type: Schema.Types.ObjectId,
        ref: 'UserHabit',
    },
    date: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(LOG_STATUS),
        required: true,
    },
    skippedAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    locationLogged: {
        type: String,
        default: null,
    },
  
},
{
    timestamps: true,
    versionKey: false
}

);

export const HabitLog = model<IHabitLog>('HabitLog', habitLogSchema);