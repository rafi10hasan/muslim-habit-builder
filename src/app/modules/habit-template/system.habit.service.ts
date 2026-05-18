import { Types } from 'mongoose';
import { NotFoundError } from '../../errors/request/apiError';
import { UserHabit } from '../user-habit/user.habit.model';
import { IUser } from '../user/user.interface';
import { SYSTEM_HABIT_MESSAGES } from './system.habit.constant';
import { HabitTemplate } from './system.habit.model';
import { TCreateHabitTemplate } from './system.habit.zod';


const GetAllHabitsWithStatus = async (user: IUser, category?: string) => {
    const userId = user._id as Types.ObjectId;

    const templateFilter: any = { isActive: true };
    if (category && category.toLowerCase() !== 'all') {
        templateFilter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // শুধু top-level templates আনো (group child না)
    const topLevelTemplates = await HabitTemplate.find({
        ...templateFilter,
        group: null,
    }).lean();

    // User এর সব UserHabit আনো
    const userHabits = await UserHabit.find({ user: userId })
        .select('template isActive _id')
        .lean();

    const userHabitMap = new Map(
        userHabits.map(h => [h.template?.toString(), h]),
    );

    const buckets: Record<string, any[]> = {
        beginner: [],
        intermediate: [],
        advanced: [],
        custom: [],
    };

    let activeCount = 0;
    let totalCount = 0;

    for (const t of topLevelTemplates) {
        const templateId = t._id.toString();

        // console.log({t})
        // Group হলে children এর isActive check করো
        let isUserActive = false;

        if (templateId) {
            const childUserHabits = await UserHabit.exists({
                user: userId,
                group: templateId,
                isActive: true,
            });
            console.log({ childUserHabits })
            isUserActive = !!childUserHabits;
        } else {
            const userHabit = userHabitMap.get(templateId);
            isUserActive = userHabit?.isActive ?? false;
        }

        if (isUserActive) activeCount++;
        totalCount++;

        const habitEntry = {
            _id: t._id,
            name: t.name,
            isUserActive,
        };

        const level = (t.level ?? 'beginner').toLowerCase();
        buckets[level in buckets ? level : 'custom'].push(habitEntry);
    }

    return {
        activeCount,
        totalCount,
        beginner: buckets.beginner,
        intermediate: buckets.intermediate,
        advanced: buckets.advanced,
        custom: buckets.custom,
    };
};


// create system habit
const createHabitTemplateIntoDB = async (payload: TCreateHabitTemplate) => {

    let groupId = null;

    if (payload.group) {
        const groupExists = await HabitTemplate.findById(payload.group).select('_id');
        groupId = groupExists?._id || null;
    }

    const newPayload = {
        ...payload,
        group: groupId,
    }

    const newTemplate = await HabitTemplate.create(newPayload);
    if (!newTemplate) {
        throw new NotFoundError(SYSTEM_HABIT_MESSAGES.CREATION_FAILED)
    }
    return {

        name: newTemplate.name,
        category: newTemplate.category,
        habitType: newTemplate.habitType,
        supportsLocation: newTemplate.supportsLocation,
        defaultFrequency: newTemplate.defaultFrequency,
        group: newTemplate.group,
        parent: newTemplate.parent,
    }


};




// update system habit
// const updateSystemHabit = async (id: string, payload: TUpdateSystemHabit) => {
//     const habit = await SystemHabit.findByIdAndUpdate(id, payload, {
//         new: true,
//         runValidators: true,
//     })
//     if (!habit) throw new NotFoundError(SYSTEM_HABIT_MESSAGES.NOT_FOUND)
//     return habit
// }


export const habitTemplateService = {
    createHabitTemplateIntoDB,
    GetAllHabitsWithStatus,
    // updateSystemHabit,
}