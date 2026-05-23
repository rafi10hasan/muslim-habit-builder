import { Types } from "mongoose"
import { HabitStatus } from "./habit.logger.constant";



export interface IHabitLog {
    
user: Types.ObjectId

userHabit: Types.ObjectId

date: string;

status: HabitStatus;

skippedAt: Date | null;

completedAt: Date | null;

locationLogged: string | null;

createdAt: Date;

updatedAt: Date;

}