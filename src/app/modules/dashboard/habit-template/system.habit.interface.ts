import { Types } from 'mongoose';
import { AllowedConnectedPrayer, ConnectedPrayer, HabitCategory, HabitLevel } from '../../../../interfaces';
import { FrequencyType, HabitLocation, WeekDay } from '../../user-habit/user.habit.constant';
import { Frequency, HabitType } from './system.habit.constant';


export interface IConnectedHabit {
  templateHabit: Types.ObjectId;
  order: number;
}

export interface IDefaultFrequency {
  type: FrequencyType;
  selectedDays?: WeekDay[];
  everyNDays?: number;
}

export interface IHabitTemplate {
  _id: Types.ObjectId;

  name: string;

  category: HabitCategory;

  connectedPrayer?: ConnectedPrayer;

  allowConnectedPrayers: AllowedConnectedPrayer[];

  isPrayerLocked: Boolean;

  habitType: HabitType;

  parent: Types.ObjectId | null;

  supportsLocation: HabitLocation;    

  group?: Types.ObjectId | null;

  defaultFrequency: IDefaultFrequency;

  allowedFrequencies: Frequency[];

  level: HabitLevel;

  connectedHabits?: IConnectedHabit[];

  isPreBuilt: boolean;

  isLocked: boolean;

  isGuestLocked: boolean;

  infoContent: string | null

  adhkarSet?: Types.ObjectId | null;  

  quranContent?: Types.ObjectId | null;

  isActive: boolean;
  
  createdAt: Date;

  updatedAt: Date;
}

