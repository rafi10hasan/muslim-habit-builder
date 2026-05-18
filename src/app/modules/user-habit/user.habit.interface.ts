import { Types } from 'mongoose';
import { ConnectedPrayer, HabitCategory } from '../../../interfaces';
import { FrequencyType, HabitLocation, TargetType, WeekDay } from './user.habit.constant';
import { Frequency, HabitType } from '../habit-template/system.habit.constant';


export interface IFrequency {
  type: FrequencyType;
  selectedDays?: WeekDay[];
  everyNDays?: number;
}

export interface IReminder {
  enabled: boolean;
  time: string;
}

export interface IConnectedHabit {
  userHabit: Types.ObjectId;
  order: number;
}

export interface IUserHabit {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  template?: Types.ObjectId;
  name: string;
  category: HabitCategory;
  connectedPrayer?: ConnectedPrayer;
  location?: HabitLocation;
  frequency: IFrequency;
  allowedFrequencies: Frequency[];
  parent: Types.ObjectId | null;
  habitType: HabitType;
  group: Types.ObjectId | null;
  reminder: IReminder;
  startDate: Date;
  showOnTodayScreen: boolean;
  targetType?: TargetType;
  infoContent: string | null
  adhkarSet?: Types.ObjectId | null;  // ref: adhkar_sets
  quranContent?: Types.ObjectId | null;
  isLocked: boolean;
  targetDescription?: string;
  connectedHabits?: IConnectedHabit[];
  customDetails?: string;
  isActive: boolean;
  progressRestartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}