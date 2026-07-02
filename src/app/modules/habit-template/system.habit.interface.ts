import { Types } from 'mongoose';
import { Frequency, HabitType } from './system.habit.constant';
import { ConnectedPrayer, HabitCategory, HabitLevel } from '../../../interfaces';
import { FrequencyType, HabitLocation, WeekDay } from '../user-habit/user.habit.constant';


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
  
  // Prayer connection (img 3, 4, 15)
  connectedPrayer?: ConnectedPrayer;
  
  allowConnectedPrayers: ConnectedPrayer[];

  isPrayerLocked: Boolean;
  // Habit type
  habitType: HabitType;
  
  parent: Types.ObjectId | null;
  // Location option (img 15: Home/Masjid)
  supportsLocation: HabitLocation;     // true just for obligatory prayers
  
  group?: Types.ObjectId | null;

  // Frequency defaults (img 15)
  defaultFrequency: IDefaultFrequency;

  allowedFrequencies: Frequency[];
  
  // Level system (img 7)
  level: HabitLevel;       
  
  connectedHabits?: IConnectedHabit[];
  
  isPreBuilt: boolean;
  
  isLocked: boolean;
  // Book icon habits (img 16: "book sign will appear next to specific habits")

  isGuestLocked: boolean;
  
  infoContent: string | null
   
  // linked adhkar set for adhkar habit
  adhkarSet?: Types.ObjectId | null;  // ref: adhkar_sets
  
  // link surah for quran habit
  quranContent?: Types.ObjectId | null;
  
  isActive: boolean; 
              // admin can disable
  createdAt: Date;

  updatedAt: Date;
}



/*
import { Types } from 'mongoose';
import { HabitTemplate } from '../models/habitTemplate.model';
import { UserHabit }     from '../models/userHabit.model';
import { HabitLog }      from '../models/habitLog.model';
import { AdhkarSet }     from '../models/adhkarSet.model';
import { AdhkarItem }    from '../models/adhkarItem.model';
import { aggregatePaginate } from '../utils/paginate';

// ─── shared helper ────────────────────────────────────────────
// Fix 3, 4: সব জায়গায় date কে "YYYY-MM-DD" string হিসেবে ব্যবহার করো
const todayStr = (): string => new Date().toISOString().split('T')[0];

// ==================== HABIT TEMPLATES ====================

export const createHabitTemplate = async (payload: any) => {
  return await HabitTemplate.create(payload);
};

export const getHabitTemplatesFromDB = async (filter: any, page: number, limit: number) => {
  const matchStage: any = { isActive: true };
  if (filter.category)  matchStage.category  = filter.category;
  if (filter.habitType) matchStage.habitType = filter.habitType;

  const pipeline = aggregatePaginate(
    [{ $match: matchStage }, { $sort: { levelOrder: 1, createdAt: -1 } }],
    page,
    limit,
  );

  const result = await HabitTemplate.aggregate(pipeline);
  return {
    data: result[0]?.data  || [],
    meta: { page, limit, total: result[0]?.total || 0 },
  };
};

export const getTemplateByIdFromDB = async (id: string) => {
  return await HabitTemplate.findById(id).lean();
};

export const updateTemplateInDB = async (id: string, payload: any) => {
  const result = await HabitTemplate.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new Error('Template not found');
  return result;
};

export const deleteTemplateFromDB = async (id: string) => {
  const result = await HabitTemplate.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!result) throw new Error('Template not found');
  return result;
};

// ==================== USER HABITS ====================

export const createUserHabitIntoDB = async (userId: Types.ObjectId, payload: any) => {
  // ── Template-based habit ──────────────────────────────────
  if (payload.templateId) {
    const exists = await UserHabit.findOne({
      userId,
      templateId: payload.templateId,
      isActive:   true,
    });
    if (exists) throw new Error('You have already added this habit.');

    const template = await HabitTemplate.findById(payload.templateId);
    if (!template) throw new Error('Template not found.');

    // Template থেকে fixed values নাও, user override করতে পারবে না
    payload.name             = template.name;
    payload.category         = template.category;
    payload.connectedPrayer  = template.connectedPrayer;
    payload.supportsLocation = template.supportsLocation;

    // ✅ Fix 5: user এর দেওয়া frequency থাকলে রাখো, না থাকলে default নাও
    if (!payload.frequency?.type) {
      payload.frequency = { type: template.defaultFrequency };
    }
  }

  if (!payload.name || !payload.category || !payload.frequency?.type) {
    throw new Error('Name, category, and frequency type are required.');
  }

  const habit = await UserHabit.create({ ...payload, userId });

  // ✅ Missing 5: habit create হওয়ার সাথে সাথে আজকের Pending log তৈরি করো
  await HabitLog.create({
    userId,
    userHabitId: habit._id,
    date:        todayStr(),
    status:      'Pending',
  });

  return habit;
};

export const getUserHabitsFromDB = async (
  userId: Types.ObjectId, filter: any, page: number, limit: number,
) => {
  const matchStage: any = { userId, isActive: true };
  if (filter.category) matchStage.category = filter.category;

  const pipeline = aggregatePaginate(
    [{ $match: matchStage }, { $sort: { displayOrder: 1, createdAt: -1 } }],
    page,
    limit,
  );

  const result = await UserHabit.aggregate(pipeline);
  return {
    data: result[0]?.data  || [],
    meta: { page, limit, total: result[0]?.total || 0 },
  };
};

export const getTodayHabitsFromDB = async (userId: Types.ObjectId) => {
  // ✅ Fix 3: Date object এর বদলে String দিয়ে filter করো
  const today = todayStr();

  const habits = await UserHabit.find({ userId, isActive: true })
    .sort({ displayOrder: 1 })
    .lean();

  const habitIds = habits.map(h => h._id);

  const logs = await HabitLog.find({
    userHabitId: { $in: habitIds },
    date:        today,          // ✅ String match
  }).lean();

  return habits.map(habit => ({
    ...habit,
    todayLog: logs.find(l => l.userHabitId.toString() === habit._id.toString()) || null,
  }));
};

export const updateUserHabitInDB = async (
  userId: Types.ObjectId, habitId: string, payload: any,
) => {
  const result = await UserHabit.findOneAndUpdate(
    { _id: habitId, userId },
    payload,
    { new: true, runValidators: true },
  );
  if (!result) throw new Error('Habit not found or unauthorized.');
  return result;
};

export const deleteUserHabitFromDB = async (userId: Types.ObjectId, habitId: string) => {
  await UserHabit.findOneAndUpdate({ _id: habitId, userId }, { isActive: false });
  return null;
};

// ✅ Missing 6: reorder service ছিল না
export const reorderUserHabitsInDB = async (
  userId: Types.ObjectId,
  habits: { habitId: string; displayOrder: number }[],
) => {
  const bulkOps = habits.map(({ habitId, displayOrder }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(habitId), userId },
      update: { $set: { displayOrder } },
    },
  }));
  await UserHabit.bulkWrite(bulkOps);
  return { message: 'Order saved successfully' };
};

export const restartHabitProgressInDB = async (userId: Types.ObjectId, habitId: string) => {
  const habit = await UserHabit.findOne({ _id: habitId, userId });
  if (!habit) throw new Error('Habit not found.');

  // সব পুরনো log মুছো
  await HabitLog.deleteMany({ userHabitId: habitId });

  habit.progressRestartedAt = new Date();
  habit.startDate           = new Date();
  await habit.save();

  // ✅ Missing 7: restart এর পরে আজকের fresh Pending log তৈরি করো
  await HabitLog.create({
    userId,
    userHabitId: habit._id,
    date:        todayStr(),
    status:      'Pending',
  });

  return habit;
};

// ==================== HABIT LOGS ====================

export const toggleHabitLogInDB = async (
  userId: Types.ObjectId, habitId: string, quranProgress?: any,
) => {
  const habit = await UserHabit.findOne({ _id: habitId, userId });
  if (!habit) throw new Error('Habit not found.');

  // ✅ Fix 3, 4: Date object এর বদলে String
  const today = todayStr();

  let log = await HabitLog.findOne({ userHabitId: habitId, date: today });

  if (log && log.status === 'Completed') {
    // Undo complete → Pending
    log.status      = 'Pending';
    log.completedAt = null;
    log.quranProgress = undefined;
    await log.save();

  } else if (log) {
    // Pending বা Skipped → Complete
    log.status      = 'Completed';
    log.completedAt = new Date();
    log.skippedAt   = null;
    if (quranProgress) log.quranProgress = quranProgress;
    await log.save();

  } else {
    // log নেই — নতুন Completed log তৈরি করো
    const newLogData: any = {
      userId,
      userHabitId:   habitId,
      date:          today,          // ✅ String
      status:        'Completed',
      completedAt:   new Date(),
      locationLogged: habit.location || null,
    };
    if (quranProgress) newLogData.quranProgress = quranProgress;
    log = await HabitLog.create(newLogData);
  }

  return log;
};

export const skipHabitLogInDB = async (userId: Types.ObjectId, habitId: string) => {
  // ✅ Fix 3: String date দিয়ে query
  const today = todayStr();

  const log = await HabitLog.findOne({ userHabitId: habitId, date: today });

  if (log && log.status === 'Skipped') {
    // undo skip → Pending
    log.status    = 'Pending';
    log.skippedAt = null;
    await log.save();
    return log;
  }

  return await HabitLog.findOneAndUpdate(
    { userHabitId: habitId, date: today },
    {
      userId,
      status:      'Skipped',
      skippedAt:   new Date(),
      completedAt: null,
      $unset:      { quranProgress: 1 },
    },
    { upsert: true, new: true, runValidators: true },
  );
};

export const getHabitLogsFromDB = async (
  userId: Types.ObjectId, habitId: string, page: number, limit: number,
) => {
  // ✅ Fix 6: userId কে ObjectId এ convert করো
  const pipeline = aggregatePaginate(
    [
      {
        $match: {
          userId:      new Types.ObjectId(userId.toString()),
          userHabitId: new Types.ObjectId(habitId),
        },
      },
      { $sort: { date: -1 } },
    ],
    page,
    limit,
  );

  const result = await HabitLog.aggregate(pipeline);
  return {
    data: result[0]?.data  || [],
    meta: { page, limit, total: result[0]?.total || 0 },
  };
};

// ==================== ADHKAR SETS & ITEMS ====================

export const createAdhkarSetIntoDB = async (payload: any) =>
  await AdhkarSet.create(payload);

export const getAdhkarSetsFromDB = async (page: number, limit: number) => {
  const pipeline = aggregatePaginate(
    [{ $match: { isActive: true } }, { $sort: { createdAt: -1 } }],
    page,
    limit,
  );
  const result = await AdhkarSet.aggregate(pipeline);
  return {
    data: result[0]?.data  || [],
    meta: { page, limit, total: result[0]?.total || 0 },
  };
};

export const updateAdhkarSetInDB = async (id: string, payload: any) => {
  const result = await AdhkarSet.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new Error('Adhkar set not found');
  return result;
};

export const deleteAdhkarSetFromDB = async (id: string) => {
  await AdhkarItem.deleteMany({ adhkarSetId: id }); // cascade delete items
  await AdhkarSet.findByIdAndDelete(id);
  return null;
};

export const createAdhkarItemIntoDB = async (payload: any) => {
  const setExists = await AdhkarSet.findById(payload.adhkarSetId);
  if (!setExists) throw new Error('Adhkar set not found');
  return await AdhkarItem.create(payload);
};

export const getAdhkarItemsFromDB = async (setId: string, page: number, limit: number) => {
  const pipeline = aggregatePaginate(
    [{ $match: { adhkarSetId: new Types.ObjectId(setId) } }, { $sort: { order: 1 } }],
    page,
    limit,
  );
  const result = await AdhkarItem.aggregate(pipeline);
  return {
    data: result[0]?.data  || [],
    meta: { page, limit, total: result[0]?.total || 0 },
  };
};

export const updateAdhkarItemInDB = async (id: string, payload: any) => {
  const result = await AdhkarItem.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new Error('Item not found');
  return result;
};

export const deleteAdhkarItemFromDB = async (id: string) => {
  await AdhkarItem.findByIdAndDelete(id);
  return null;
};

*/


/*
import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { sendResponse } from '../utils/sendResponse';
import * as habitService from '../services/habit.service';
import * as validation from '../validations/habit.validation';

// ==================== HABIT TEMPLATES ====================

export const createTemplateIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.createTemplateSchema.parse(req.body);
  const result = await habitService.createHabitTemplate(validatedData);
  sendResponse(res, { statusCode: 201, success: true, message: 'Template created successfully', data: result });
});

export const getTemplatesFromDb = asyncHandler(async (req: Request, res: Response) => {
  const { category, habitType, page = '1', limit = '10' } = req.query;
  const result = await habitService.getHabitTemplatesFromDB(
    { category, habitType },
    Number(page),
    Number(limit),
  );
  sendResponse(res, { statusCode: 200, success: true, message: 'Templates retrieved successfully', data: result.data, meta: result.meta });
});

export const getTemplateByIdFromDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await habitService.getTemplateByIdFromDB(req.params.id);
  if (!result) throw new Error('Template not found');
  sendResponse(res, { statusCode: 200, success: true, message: 'Template retrieved successfully', data: result });
});

export const updateTemplateInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.updateTemplateSchema.parse(req.body);
  const result = await habitService.updateTemplateInDB(req.params.id, validatedData);
  sendResponse(res, { statusCode: 200, success: true, message: 'Template updated successfully', data: result });
});

export const deleteTemplateFromDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await habitService.deleteTemplateFromDB(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: 'Template deleted successfully', data: result });
});

// ==================== USER HABITS ====================

export const createUserHabitIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.createUserHabitSchema.parse(req.body);
  // @ts-ignore
  const result = await habitService.createUserHabitIntoDB(req.user.id, validatedData);
  sendResponse(res, { statusCode: 201, success: true, message: 'Habit added to your list', data: result });
});

export const getUserHabitsFromDb = asyncHandler(async (req: Request, res: Response) => {
  const { category, page = '1', limit = '10' } = req.query;
  // @ts-ignore
  const result = await habitService.getUserHabitsFromDB(req.user.id, { category }, Number(page), Number(limit));
  sendResponse(res, { statusCode: 200, success: true, message: 'Habits retrieved successfully', data: result.data, meta: result.meta });
});

export const getTodayHabitsFromDb = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const result = await habitService.getTodayHabitsFromDB(req.user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Today's habits retrieved successfully", data: result });
});

export const updateUserHabitInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.updateUserHabitSchema.parse(req.body);
  // @ts-ignore
  const result = await habitService.updateUserHabitInDB(req.user.id, req.params.id, validatedData);
  sendResponse(res, { statusCode: 200, success: true, message: 'Habit updated successfully', data: result });
});

export const deleteUserHabitFromDb = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  await habitService.deleteUserHabitFromDB(req.user.id, req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: 'Habit deactivated successfully', data: null });
});

// ✅ Missing 6: reorder controller ছিল না
export const reorderUserHabitsInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.reorderHabitsSchema.parse(req.body);
  // @ts-ignore
  const result = await habitService.reorderUserHabitsInDB(req.user.id, validatedData.habits);
  sendResponse(res, { statusCode: 200, success: true, message: 'Order saved successfully', data: result });
});

export const restartHabitProgressInDb = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const result = await habitService.restartHabitProgressInDB(req.user.id, req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: 'Habit progress restarted', data: result });
});

// ==================== HABIT LOGS ====================

export const toggleHabitLogInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.toggleLogSchema.parse(req.body);
  // @ts-ignore
  const result = await habitService.toggleHabitLogInDB(req.user.id, req.params.habitId, validatedData.quranProgress);
  sendResponse(res, {
    statusCode: 200,
    success:    true,
    message:    result.status === 'Completed' ? 'Habit completed!' : 'Habit unmarked',
    data:       result,
  });
});

export const skipHabitLogInDb = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const result = await habitService.skipHabitLogInDB(req.user.id, req.params.habitId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Habit skip status updated', data: result });
});

export const getHabitLogsFromDb = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  // @ts-ignore
  const result = await habitService.getHabitLogsFromDB(req.user.id, req.params.habitId, Number(page), Number(limit));
  sendResponse(res, { statusCode: 200, success: true, message: 'Habit logs retrieved successfully', data: result.data, meta: result.meta });
});

// ==================== ADHKAR SETS ====================

export const createAdhkarSetIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.createAdhkarSetSchema.parse(req.body);
  const result = await habitService.createAdhkarSetIntoDB(validatedData);
  sendResponse(res, { statusCode: 201, success: true, message: 'Adhkar set created', data: result });
});

export const getAdhkarSetsFromDb = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const result = await habitService.getAdhkarSetsFromDB(Number(page), Number(limit));
  sendResponse(res, { statusCode: 200, success: true, message: 'Adhkar sets retrieved', data: result.data, meta: result.meta });
});

// ✅ Fix 7: updateAdhkarSetSchema (partial) দিয়ে validate করো
export const updateAdhkarSetInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.updateAdhkarSetSchema.parse(req.body);
  const result = await habitService.updateAdhkarSetInDB(req.params.id, validatedData);
  sendResponse(res, { statusCode: 200, success: true, message: 'Adhkar set updated', data: result });
});

export const deleteAdhkarSetInDb = asyncHandler(async (req: Request, res: Response) => {
  await habitService.deleteAdhkarSetFromDB(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: 'Adhkar set deleted', data: null });
});

// ==================== ADHKAR ITEMS ====================

export const createAdhkarItemIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.createAdhkarItemSchema.parse(req.body);
  const result = await habitService.createAdhkarItemIntoDB(validatedData);
  sendResponse(res, { statusCode: 201, success: true, message: 'Adhkar item added', data: result });
});

export const getAdhkarItemsFromDb = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const result = await habitService.getAdhkarItemsFromDB(req.params.setId, Number(page), Number(limit));
  sendResponse(res, { statusCode: 200, success: true, message: 'Adhkar items retrieved', data: result.data, meta: result.meta });
});

// ✅ Fix 8: updateAdhkarItemSchema দিয়ে validate করো
export const updateAdhkarItemInDb = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validation.updateAdhkarItemSchema.parse(req.body);
  const result = await habitService.updateAdhkarItemInDB(req.params.id, validatedData);
  sendResponse(res, { statusCode: 200, success: true, message: 'Item updated', data: result });
});

export const deleteAdhkarItemInDb = asyncHandler(async (req: Request, res: Response) => {
  await habitService.deleteAdhkarItemFromDB(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: 'Item deleted', data: null });
});

*/