import moment from 'moment-timezone';
import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { HabitLog } from '../habit-logs/habit.log.model';
import { HabitTemplate } from '../habit-template/system.habit.model';
import { IUser } from '../user/user.interface';
import { FREQUENCY_TYPES, WeekDay } from './user.habit.constant';
import { IConnectedHabit, IFrequency } from './user.habit.interface';
import { UserHabit } from './user.habit.model';
import { buildDateBasedOnTimeZone } from './user.habit.utils';
import { AddCustomHabitPayload, EditHabitPayload } from './user.habit.zod';


// ─────────────────────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────────────────────

const buildHabitPayload = (userId: Types.ObjectId, template: any) => ({
    user: userId,
    template: template._id,
    name: template.name,
    category: template.category,
    habitType: template.habitType,
    group: template.group ?? null,
    parent: template.parent ?? null,

    // Prayer
    connectedPrayer: template.connectedPrayer ?? null,

    // Location
    supportsLocation: template.supportsLocation ?? false,
    location: template.supportsLocation ? 'Masjid' : 'Home',

    // Lock
    isLocked: template.isLocked ?? false,

    // Info
    hasInfoContent: Array.isArray(template.infoContent)
        ? template.infoContent.length > 0
        : !!template.infoContent,
    infoContent: template.infoContent ?? null,

    // Reading content
    adhkarSet: template.adhkarSet ?? null,
    quranContent: template.quranContent ?? null,

    // Target
    targetType: template.targetType ?? null,
    targetDescription: template.targetDescription ?? null,
    allowedFrequencies: template.allowedFrequencies ?? [],
    // Frequency
    frequency: {
        type: template.defaultFrequency,
        selectedDays: [],
        everyNDays: undefined,
    },

    // Defaults
    reminder: { enabled: false, time: '12:00 AM' },
    startDate: new Date(),
    showOnTodayScreen: true,
    displayOrder: 0,
    isActive: true,
    connectedHabits: template.connectedHabits ?? [],
    customDetails: null,
});


// habit connect
const connectToParent = async (
    userId: Types.ObjectId,
    parentTemplateId: Types.ObjectId,
    newUserHabitId: Types.ObjectId,
) => {
    console.log({ userId, parentTemplateId, newUserHabitId })

    const parentUserHabit = await UserHabit.findOne({
        user: userId,
        template: parentTemplateId,
        isActive: true,
    }).select('_id connectedHabits');


    console.log({ parentUserHabit })
    if (!parentUserHabit) return;

    console.log({ parentUserHabitConnected: parentUserHabit.connectedHabits })
    const alreadyConnected = parentUserHabit.connectedHabits?.some(
        (c: IConnectedHabit) => c.userHabit.toString() === newUserHabitId.toString(),
    );
    if (alreadyConnected) return;
    console.log({ alreadyConnected })
    console.log("asd", parentUserHabit.connectedHabits?.length)
    const maxOrder = parentUserHabit.connectedHabits?.reduce(
        (max: number, c: IConnectedHabit) => Math.max(max, c.order ?? 0),
        0,
    ) ?? 0;

    console.log({ maxOrder });

    await UserHabit.updateOne(
        { _id: parentUserHabit._id },
        {
            $push: {
                connectedHabits: {
                    userHabit: newUserHabitId,
                    order: maxOrder + 1,
                },
            },
        },
    );
};

// habit deactivate হলে সব parent UserHabit এর connectedHabits থেকে remove করো
const disconnectFromParents = async (userHabitId: Types.ObjectId) => {
    await UserHabit.updateMany(
        { 'connectedHabits.userHabit': userHabitId },
        { $pull: { connectedHabits: { userHabit: userHabitId } } },
    );
};

// ─────────────────────────────────────────────────────────────
//  TOGGLE HABIT
// ─────────────────────────────────────────────────────────────
const toggleHabit = async (user: IUser, habitId: string, isActive: boolean) => {
    const userId = user._id as Types.ObjectId;
    const date = buildDateBasedOnTimeZone(new Date(), user.timezone as string);

    // ─────────────────────────────────────────────────────────
    //  DEACTIVATE PATH
    // ─────────────────────────────────────────────────────────
    if (!isActive) {
        const childTemplates = await HabitTemplate.find({
            group: habitId,
            isActive: true,
        }).lean();
        console.log({ childTemplates })
        const isGroup = childTemplates.length > 0;

        // ── Group deactivate ──
        if (isGroup) {
            const activeHabits = await UserHabit.find({
                user: userId,
                template: { $in: childTemplates.map(c => c._id) },
                isActive: true,
            }).select('_id').lean();
            console.log({ activeHabits })
            if (!activeHabits.length) {
                throw new BadRequestError('No active habits found in this group.');
            }

            const habitIds = activeHabits.map(h => h._id);

            await UserHabit.updateMany(
                { _id: { $in: habitIds } },
                { $set: { isActive: false } },
            );

            await HabitLog.updateMany(
                { userHabit: { $in: habitIds }, date, status: 'Pending' },
                { $set: { status: 'Skipped', skippedAt: new Date() } },
            );

            // সব child habit কে তাদের parent এর connectedHabits থেকে disconnect করো
            await Promise.all(habitIds.map(id => disconnectFromParents(id)));

            console.log({ habitIds })

            // ami boltesi ekhane fazr deactivate thakle fazr sunnah jeno today habit na theke 
            const activeChildHabits = await UserHabit.find({
                user: userId,
                parent: { $in: childTemplates.map(c => c._id) },
                isActive: true,
            }).select('_id').lean();

            if (activeChildHabits.length) {
                await UserHabit.updateMany(
                    { _id: { $in: activeChildHabits.map(h => h._id) } },
                    { $set: { isActive: false } }
                );
            }

            return null;
        }

        // ── Single deactivate ──
        const userHabit = await UserHabit.findOne({
            template: habitId,
            user: userId,
            isActive: true,
        });

        if (!userHabit) {
            const customHabit = await UserHabit.findOne({
                _id: habitId,
                user: userId,
                template: null,
            });

            console.log({ customHabit });

            if (!customHabit) {
                throw new BadRequestError('custom habit not found');
            }
            if (!customHabit.isActive) {
                throw new BadRequestError('Habit is already deactivated');
            }
            await HabitLog.findOneAndUpdate(
                { userHabit: customHabit._id, date, status: 'Pending' },
                { $set: { status: 'Skipped', skippedAt: new Date() } },
            );
            customHabit.isActive = false;
            await customHabit.save()
            // Parent এর connectedHabits থেকে disconnect করো
            await disconnectFromParents(customHabit._id);

            return null;
        }

        if (userHabit) {
            userHabit.isActive = false;
            userHabit.parent = null;
            await userHabit?.save();

            await HabitLog.findOneAndUpdate(
                { userHabit: userHabit._id, date, status: 'Pending' },
                { $set: { status: 'Skipped', skippedAt: new Date() } },
            );

            // Parent এর connectedHabits থেকে disconnect করো
            await disconnectFromParents(userHabit._id);

            return null;
        }

    }

    // ─────────────────────────────────────────────────────────
    //  ACTIVATE PATH
    // ─────────────────────────────────────────────────────────
    const template = await HabitTemplate.findById(habitId).lean();

    if (!template) {
        // check it is custom habit activation with template null
        const userCustomHabit = await UserHabit.findOne({ user: userId, _id: habitId, template: null }).lean();
        if (!userCustomHabit) {
            throw new NotFoundError('Habit template not found');
        }

        if (userCustomHabit.isActive) {
            throw new BadRequestError('Habit is already active');
        }
        const existingLog = await HabitLog.findOne({
            userHabit: userCustomHabit._id,
            date,
        });

        if (existingLog) {
            if (existingLog.status === 'Skipped') {
                existingLog.status = 'Pending';
                existingLog.skippedAt = null;
                await existingLog.save();
            }
        } else {
            await HabitLog.create({
                user: userId,
                userHabit: userCustomHabit._id,
                date,
                status: 'Pending',
            });
        }
        await UserHabit.updateOne(
            { _id: userCustomHabit._id },
            { $set: { isActive: true, startDate: new Date() } }
        );

        return { added: [{ _id: userCustomHabit._id, name: userCustomHabit.name }], skipped: null };
    }

    // non custom habit activation with template found but inactive
    if (!template?.isActive) throw new BadRequestError('This habit is no longer available');

    const childTemplates = await HabitTemplate.find({
        group: habitId,
        isActive: true,
    }).lean();

    const isGroup = childTemplates.length > 0;

    // ── CASE 1: Group activate ──
    if (isGroup) {
        const existingHabits = await UserHabit.find({
            user: userId,
            template: { $in: childTemplates.map(c => c._id) },
        }).select('template isActive _id').lean();

        const existingMap = new Map(
            existingHabits.map(h => [h.template?.toString(), h]),
        );

        const toReactivate: Types.ObjectId[] = [];
        const toReactivateWithTemplate: { id: Types.ObjectId; templateId: Types.ObjectId }[] = [];
        const toCreate: typeof childTemplates = [];

        for (const child of childTemplates) {
            const existing = existingMap.get(child._id.toString());
            if (!existing) {
                toCreate.push(child);
            } else if (!existing.isActive) {
                toReactivate.push(existing._id);
                toReactivateWithTemplate.push({
                    id: existing._id,
                    templateId: child._id,
                });
            }
            // already active → skip silently
        }

        if (!toReactivate.length && !toCreate.length) {
            throw new BadRequestError('You have already added all habits from this group.');
        }

        // Reactivate soft-deleted habits
        if (toReactivate.length) {
            await UserHabit.updateMany(
                { _id: { $in: toReactivate } },
                { $set: { isActive: true, startDate: new Date() } },
            );

            // Today log check
            const existingLogs = await HabitLog.find({
                userHabit: { $in: toReactivate },
                date,
            }).select('userHabit status').lean();

            const existingLogMap = new Map(
                existingLogs.map(l => [l.userHabit?.toString(), l]),
            );

            const logsToInsert: Types.ObjectId[] = [];

            for (const id of toReactivate) {
                const existingLog = existingLogMap.get(id.toString());
                if (!existingLog) {
                    logsToInsert.push(id);
                } else if (existingLog.status === 'Skipped') {
                    await HabitLog.updateOne(
                        { userHabit: id, date },
                        { $set: { status: 'Pending', skippedAt: null } },
                    );
                }
            }

            if (logsToInsert.length) {
                await HabitLog.insertMany(
                    logsToInsert.map(id => ({
                        user: userId,
                        userHabit: id,
                        date,
                        status: 'Pending',
                    })),
                );
            }

            // Reactivated habits কে parent এর connectedHabits এ reconnect করো
            const reactivatedTemplates = await HabitTemplate.find({
                _id: { $in: toReactivateWithTemplate.map(r => r.templateId) },
            }).select('_id parent').lean();

            const reactivatedTemplateMap = new Map(
                reactivatedTemplates.map(t => [t._id.toString(), t]),
            );

            for (const { id, templateId } of toReactivateWithTemplate) {
                const tmpl = reactivatedTemplateMap.get(templateId.toString());
                if (tmpl?.parent) {
                    await connectToParent(userId, tmpl.parent, id);
                }
            }
        }


        // Brand new habits create (with parent check)
        const skippedNames: string[] = [];
        const canAdd: typeof toCreate = [];

        for (const child of toCreate) {
            if (child.parent) {
                const parentActive = await UserHabit.exists({
                    user: userId,
                    template: child.parent,
                    isActive: true,
                });

                if (!parentActive) {
                    skippedNames.push(child.name);
                    continue;
                }
            }
            canAdd.push(child);
        }

        if (!canAdd.length && !toReactivate.length) {
            throw new BadRequestError(
                `Activate the obligatory prayers first to unlock: ${skippedNames.join(', ')}`,
            );
        }

        let newHabits: any[] = [];
        if (canAdd.length) {
            const payloads = canAdd.map(t => buildHabitPayload(userId, t));
            newHabits = await UserHabit.insertMany(payloads);

            await HabitLog.insertMany(
                newHabits.map(h => ({
                    user: userId,
                    userHabit: h._id,
                    date,
                    status: 'Pending',
                })),
            );

            // নতুন habits কে parent এর connectedHabits এ connect করো
            for (let i = 0; i < newHabits.length; i++) {
                const tmpl = canAdd[i];
                if (tmpl.parent) {
                    await connectToParent(userId, tmpl.parent, newHabits[i]._id);
                }
            }
        }

        return {
            added: newHabits.map(h => ({ _id: h._id, name: h.name })),
            reactivated: toReactivate.map(id => ({ _id: id })),
            skipped: skippedNames.length
                ? `${skippedNames.join(', ')} skipped — activate the required habits first`
                : null,
        };
    }

    // ── CASE 2: Single activate ──
    const existingHabit = await UserHabit.findOne({
        user: userId,
        template: habitId,
    });

    if (existingHabit) {
        if (existingHabit.isActive) {
            throw new BadRequestError('habit is already activated.');
        }

        // Parent active কিনা check
        if (template.parent) {
            const parentActive = await UserHabit.exists({
                user: userId,
                template: template.parent,
                isActive: true,
            });

            if (!parentActive) {
                throw new BadRequestError(
                    'Activate the required habit first to unlock this habit.',
                );
            }
        }

        existingHabit.isActive = true;
        existingHabit.startDate = new Date();
        await existingHabit.save();

        // Log handle
        const existingLog = await HabitLog.findOne({
            userHabit: existingHabit._id,
            date,
        });

        if (existingLog) {
            if (existingLog.status === 'Skipped') {
                existingLog.status = 'Pending';
                existingLog.skippedAt = null;
                await existingLog.save();
            }
        } else {
            await HabitLog.create({
                user: userId,
                userHabit: existingHabit._id,
                date,
                status: 'Pending',
            });
        }

        // Parent এর connectedHabits এ reconnect করো
        if (template.parent) {
            await connectToParent(userId, template.parent, existingHabit._id);
        }

        return { added: [{ _id: existingHabit._id, name: existingHabit.name }], skipped: null };
    }

    // No existing habit — create fresh
    if (template.parent) {
        const parentActive = await UserHabit.exists({
            user: userId,
            template: template.parent,
            isActive: true,
        });

        if (!parentActive) {
            throw new BadRequestError(
                'Activate the required habit first to unlock this habit.',
            );
        }
    }

    // Cast to any to satisfy Mongoose create overload typing when payload contains nullable fields
    const newHabit = await UserHabit.create(buildHabitPayload(userId, template) as any);

    await HabitLog.create({
        user: userId,
        userHabit: newHabit._id,
        date,
        status: 'Pending',
    });

    // Parent এর connectedHabits এ connect করো
    if (template.parent) {
        await connectToParent(userId, template.parent, newHabit._id);
    }

    return { added: [{ _id: newHabit._id, name: newHabit.name }], skipped: null };
};


// get today habits
// const getTodayHabits = async (user: IUser, category?: string) => {
//     const userId = user._id as Types.ObjectId;
//     const date = buildDateBasedOnTimeZone(new Date(), user.timezone as string);

//     // আগে সব active habits আনো connected ids বের করতে
//     const allActiveHabits = await UserHabit.find({
//         user: userId,
//         isActive: true,
//     }).select('_id connectedHabits').lean();

//     // সব connected habit ids একটা Set এ রাখো
//     const connectedHabitIds = new Set(
//         allActiveHabits.flatMap(h =>
//             (h.connectedHabits ?? []).map((c: any) =>
//                 c.userHabit?.toString(),
//             ),
//         ),
//     );

//     const filter: any = {
//         user: userId,
//         isActive: true,
//         _id: { $nin: [...connectedHabitIds] },  // ← connected habits exclude
//     };

//     if (category && category.toLowerCase() !== 'all') {
//         filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
//     }

//     const habits = await UserHabit.find(filter)
//         .select('_id name category displayOrder connectedHabits habitType')
//         .populate({
//             path: 'connectedHabits.userHabit',
//             select: '_id name category',
//         })
//         .sort({ displayOrder: 1 })
//         .lean();


//     const allUserHabitIds = habits.map(h => h._id);
//     const connectedIds = habits.flatMap(h =>
//         (h.connectedHabits ?? []).map((c: any) => c.userHabit?._id ?? c.userHabit),
//     );
//     const allIds = [...allUserHabitIds, ...connectedIds];

//     // Today এর existing logs আনো
//     const existingLogs = await HabitLog.find({
//         userHabit: { $in: allIds },
//         date,
//     }).select('userHabit status').lean();

//     const logMap = new Map(
//         existingLogs.map(l => [l.userHabit?.toString(), l.status]),
//     );

//     // Missing logs create করো
//     const missingLogIds = allIds.filter(id => !logMap.has(id.toString()));

//     if (missingLogIds.length) {
//         await HabitLog.insertMany(
//             missingLogIds.map(id => ({
//                 user: userId,
//                 userHabit: id,
//                 date,
//                 status: 'Pending',
//             })),
//         );
//         missingLogIds.forEach(id => logMap.set(id.toString(), 'Pending'));
//     }

//     // Response build করো
//     const result = habits.map(h => {
//         const connectedHabits = (h.connectedHabits ?? []).map((c: any) => {
//             const child = c.userHabit;
//             const childId = child?._id?.toString() ?? child?.toString();
//             return {
//                 _id: child?._id ?? child,
//                 name: child?.name ?? null,
//                 order: c.order,
//                 status: logMap.get(childId) ?? 'Pending',
//             };
//         });

//         return {
//             _id: h._id,
//             name: h.name,
//             category: h.category,
//             habitType: h.habitType,
//             status: logMap.get(h._id.toString()) ?? 'Pending',
//             connectedHabits,
//         };
//     });

//     const completed = result.filter(h => h.status === 'Completed').length;
//     const total = result.length;

//     return {
//         summary: `${completed} of ${total} completed`,
//         total,
//         habits: result,
//     };
// };


const getTodayHabits = async (user: IUser, category?: string) => {
    const userId = user._id as Types.ObjectId;
    const date = buildDateBasedOnTimeZone(new Date(), user.timezone as string);

    // Today's day name বের করো (mon, tue, wed...)
    const todayDayName = moment(date)
        .tz(user.timezone as string)
        .format('ddd')
        .toLowerCase() as WeekDay;

    // আগে সব active habits আনো connected ids বের করতে
    const allActiveHabits = await UserHabit.find({
        user: userId,
        isActive: true,
    }).select('_id connectedHabits').lean();

    // সব connected habit ids একটা Set এ রাখো
    const connectedHabitIds = new Set(
        allActiveHabits.flatMap(h =>
            (h.connectedHabits ?? []).map((c: any) => c.userHabit?.toString()),
        ),
    );

    const filter: any = {
        user: userId,
        isActive: true,
        _id: { $nin: [...connectedHabitIds] },
    };

    if (category && category.toLowerCase() !== 'all') {
        filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const habits = await UserHabit.find(filter)
        .select('_id name category connectedHabits habitType infoContent adhkarSet quranContent frequency startDate')
        .populate({
            path: 'connectedHabits.userHabit',
            select: '_id name category frequency startDate',
        })
        .sort({ displayOrder: 1 })
        .lean();

    // ─────────────────────────────────────────────────────────
    //  FREQUENCY CHECK HELPER
    // ─────────────────────────────────────────────────────────
    const shouldShowToday = (frequency: IFrequency, startDate: Date): boolean => {
        switch (frequency.type) {
            case FREQUENCY_TYPES.DAILY:
                return true;

            case FREQUENCY_TYPES.WEEKLY: {
                if (!frequency.selectedDays?.length) return false;
                return frequency.selectedDays.includes(todayDayName);
            }

            case FREQUENCY_TYPES.EVERY_N_DAYS: {
                if (!frequency.everyNDays) return false;
                const start = buildDateBasedOnTimeZone(startDate, user.timezone as string);
                const diffMs = date.getTime() - start.getTime();
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                // startDate থেকে diffDays, everyNDays এর multiple হলে show করো
                return diffDays >= 0 && diffDays % frequency.everyNDays === 0;
            }

            default:
                return true;
        }
    };

    // Frequency filter — আজকের জন্য না হলে বাদ
    const todayHabits = habits.filter(h => shouldShowToday(h.frequency, h.startDate));

    const allUserHabitIds = todayHabits.map(h => h._id);
    const connectedIds = todayHabits.flatMap(h =>
        (h.connectedHabits ?? [])
            .filter((c: any) => {
                const child = c.userHabit;
                // Connected habit এর frequency ও check করো
                return child?.frequency
                    ? shouldShowToday(child.frequency, child.startDate)
                    : true;
            })
            .map((c: any) => c.userHabit?._id ?? c.userHabit),
    );

    const allIds = [...allUserHabitIds, ...connectedIds];

    // Today এর existing logs আনো
    const existingLogs = await HabitLog.find({
        userHabit: { $in: allIds },
        date,
    }).select('userHabit status').lean();

    const logMap = new Map(
        existingLogs.map(l => [l.userHabit?.toString(), l.status]),
    );

    // Missing logs create করো
    const missingLogIds = allIds.filter(id => !logMap.has(id.toString()));
    if (missingLogIds.length) {
        await HabitLog.insertMany(
            missingLogIds.map(id => ({
                user: userId,
                userHabit: id,
                date,
                status: 'Pending',
            })),
        );
        missingLogIds.forEach(id => logMap.set(id.toString(), 'Pending'));
    }

    // ─────────────────────────────────────────────────────────
    //  RESPONSE BUILD
    // ─────────────────────────────────────────────────────────
    const result = todayHabits.map(h => {
        const connectedHabits = (h.connectedHabits ?? [])
            .filter((c: any) => {
                const child = c.userHabit;
                return child?.frequency
                    ? shouldShowToday(child.frequency, child.startDate)
                    : true;
            })
            .sort((a: any, b: any) => a.order - b.order)
            .map((c: any) => {
                const child = c.userHabit;
                const childId = child?._id?.toString() ?? child?.toString();
                return {
                    _id: child?._id ?? child,
                    name: child?.name ?? null,
                    status: logMap.get(childId) ?? 'Pending',
                };
            });

        const parentStatus = logMap.get(h._id.toString()) ?? 'Pending';

        return {
            _id: h._id,
            name: h.name,
            category: h.category,
            habitType: h.habitType,
            infoContent: h.infoContent,
            adhakarSet: h.adhkarSet,
            quranContent: h.quranContent,
            status: parentStatus,
            connectedHabits,
        };
    });

    // ─────────────────────────────────────────────────────────
    //  SUMMARY
    // ─────────────────────────────────────────────────────────
    const total = result.length;
    const completed = result.filter(h => h.status === 'Completed').length;
    const pending = result.filter(h => h.status === 'Pending').length;
    const skipped = result.filter(h => h.status === 'Skipped').length;

    const completedHabits = result
        .filter(h => h.status === 'Completed')
        .map(h => ({ _id: h._id, name: h.name }));

    return {
        summary: {
            total,
            completed,
            pending,
            skipped,
            label: `${completed} of ${total} completed`,
        },
        completedToday: completedHabits,
        habits: result,
    };
};



// ─────────────────────────────────────────────────────────────
//  connectToParent — order এখন existing max থেকে
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
//  EditHabit — connectedHabits string[] আসবে, order index থেকে set হবে
// ─────────────────────────────────────────────────────────────
const updateUserHabit = async (user: IUser, userHabitId: string, payload: EditHabitPayload) => {
    const userId = user._id as Types.ObjectId;

    const habit = await UserHabit.findOne({
        _id: userHabitId,
        user: userId,
        isActive: true,
    });
    if (!habit) throw new NotFoundError('Habit not found');

    // Frequency
    if (payload.frequency) {
        if (!habit.allowedFrequencies.includes(payload.frequency.type as any)) {
            throw new BadRequestError(
                `Frequency '${payload.frequency.type}' is not allowed for this habit`,
            );
        }
        habit.frequency = payload.frequency as any;
    }

    // Reminder
    if (payload.reminder !== undefined) {
        habit.reminder = payload.reminder as any;
    }

    // StartDate
    if (payload.startDate !== undefined) {
        habit.startDate = payload.startDate;
    }

    // Location
    if (payload.location !== undefined) {
        habit.location = payload.location as any;
    }

    // showOnTodayScreen
    if (payload.customDetails !== undefined) {
        habit.showOnTodayScreen = true;
    }

    // Connected habits — only for obligatory_prayer
    // if (payload.connectedHabits !== undefined) {
    //     if (habit.habitType !== 'obligatory_prayer') {
    //         throw new BadRequestError('Only obligatory prayers can have connected habits');
    //     }

    //     if (payload.connectedHabits.length) {
    //         // Validate সব ids এই user এর active habits
    //         const validHabits = await UserHabit.find({
    //             _id: { $in: payload.connectedHabits },
    //             user: userId,
    //             isActive: true,
    //         }).select('_id').lean();

    //         if (validHabits.length !== payload.connectedHabits.length) {
    //             throw new BadRequestError(
    //                 'One or more connected habits are invalid or inactive',
    //             );
    //         }
    //     }

    //     // Remove হওয়া habits এর parent null করো
    //     const oldIds = (habit.connectedHabits ?? []).map(c => c.userHabit.toString());
    //     const newIds = payload.connectedHabits.map(c => c.userHabit.toString());
    //     const removedIds = oldIds.filter(id => !newIds.includes(id));

    //     if (removedIds.length) {
    //         await UserHabit.updateMany(
    //             { _id: { $in: removedIds }, user: userId },
    //             { $set: { parent: null } },
    //         );
    //         // Parent এর connectedHabits থেকেও disconnect
    //         await Promise.all(removedIds.map(id =>
    //             disconnectFromParents(new Types.ObjectId(id))
    //         ));
    //     }

    //     // নতুন ids এর parent set করো
    //     const addedIds = newIds.filter(id => !oldIds.includes(id));
    //     if (addedIds.length) {
    //         await UserHabit.updateMany(
    //             { _id: { $in: addedIds }, user: userId },
    //             { $set: { parent: habit.template } },
    //         );
    //     }

    //     // Array index থেকে order set করো
    //     habit.connectedHabits = payload.connectedHabits.map((item, index) => ({
    //         userHabit: new Types.ObjectId(item.userHabit),
    //         order: item.order ?? index + 1,
    //     }));
    // }

    if (payload.connectedHabits !== undefined) {
        if (habit.habitType !== 'obligatory_prayer') {
            throw new BadRequestError('Only obligatory prayers can have connected habits');
        }

        const inputIds = payload.connectedHabits; // পোস্টম্যান থেকে আসা নতুন আইডিগুলো

        if (inputIds.length) {
            // ১. বর্তমানের অলরেডি কানেক্টেড আইডিগুলোর লিস্ট এবং ম্যাক্সিমাম অর্ডার বের করুন
            const existingConnectedHabits = habit.connectedHabits ?? [];
            const existingIds = existingConnectedHabits.map(c => c.userHabit.toString());

            // ২. ইনপুট আইডিগুলোর মধ্যে যেগুলো অলরেডি কানেক্টেড আছে, সেগুলোকে ফিল্টার করে বাদ দিন (যাতে ডুপ্লিকেট না হয়)
            const uniqueNewIds = inputIds.filter(id => !existingIds.includes(id));

            if (uniqueNewIds.length) {
                // ৩. ভ্যালিডেশন: নতুন আইডিগুলো এই ইউজারের অ্যাক্টিভ হ্যাবিট কিনা চেক করুন
                const validHabits = await UserHabit.find({
                    _id: { $in: uniqueNewIds },
                    user: userId,
                    isActive: true,
                }).select('_id').lean();

                if (validHabits.length !== uniqueNewIds.length) {
                    throw new BadRequestError(
                        'One or more connected habits are invalid or inactive',
                    );
                }

                // ৪. নতুন আইডিগুলোর জন্য parent সেট করুন
                await UserHabit.updateMany(
                    { _id: { $in: uniqueNewIds }, user: userId },
                    { $set: { parent: habit.template } },
                );

                // ৫. বর্তমানের সর্বোচ্চ অর্ডার (maxOrder) খুঁজে বের করুন
                const maxOrder = existingConnectedHabits.reduce(
                    (max, item) => (item.order > max ? item.order : max),
                    0
                );

                // ৬. নতুন আইডিগুলোকে অর্ডারের ক্রমানুসারে অবজেক্ট আকারে ম্যাপ করুন
                const formattedNewHabits = uniqueNewIds.map((id, index) => ({
                    userHabit: new Types.ObjectId(id),
                    order: maxOrder + index + 1, // আগের সর্বোচ্চ অর্ডারের পর থেকে শুরু হবে
                }));

                // ৭. আগের অ্যারের সাথে নতুন অ্যারেটি যুক্ত (Append) করে দিন
                habit.connectedHabits = [...existingConnectedHabits, ...formattedNewHabits];
            }
        }
    }

    await habit.save();

    return {
        _id: habit._id,
        name: habit.name,
    };
};

// Get Habit Detail
const getHabitDetail = async (user: IUser, userHabitId: string) => {
    const userId = user._id as Types.ObjectId;

    const habit = await UserHabit.findOne({
        _id: userHabitId,
        user: userId,
        isActive: true,
    })
        .populate({
            path: 'connectedHabits.userHabit',
            select: '_id name category habitType isLocked',
        })
        .lean();

    if (!habit) throw new NotFoundError('Habit not found');

    const isObligatoryPrayer = habit.habitType === 'obligatory_prayer';

    return {
        _id: habit._id,
        name: habit.name,
        category: habit.category,
        habitType: habit.habitType,
        connectedPrayer: habit.connectedPrayer ?? null,
        location: habit.location ?? null,
        frequency: habit.frequency,
        allowedFrequencies: habit.allowedFrequencies,
        reminder: habit.reminder,
        startDate: habit.startDate,
        showOnTodayScreen: habit.showOnTodayScreen,
        isLocked: habit.isLocked,
        // obligatory_prayer হলেই connectedHabits দেখাবে
        connectedHabits: isObligatoryPrayer
            ? (habit.connectedHabits ?? [])
                .sort((a, b) => a.order - b.order)
                .map((c: any) => ({
                    _id: c.userHabit?._id ?? c.userHabit,
                    name: c.userHabit?.name ?? null,
                    category: c.userHabit?.category ?? null,
                    habitType: c.userHabit?.habitType ?? null,
                    isLocked: c.userHabit?.isLocked ?? false,
                }))
            : undefined,
    };
};


// ─────────────────────────────────────────────────────────────
//  3. ADD CUSTOM HABIT
// ─────────────────────────────────────────────────────────────
const addCustomHabit = async (user: IUser, payload: AddCustomHabitPayload) => {
    const userId = user._id as Types.ObjectId;
    const date = buildDateBasedOnTimeZone(new Date(), user.timezone as string);


    // Duplicate name check for this user
    const duplicate = await UserHabit.exists({
        user: userId,
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') },
        isActive: true,
    });
    if (duplicate) throw new BadRequestError('You already have a habit with this name');

    console.log({ payload })

    const newHabit = await UserHabit.create({
        user: userId,
        template: null,
        name: payload.name.trim(),
        category: payload.category,
        connectedPrayer: payload.connectedPrayer ?? null,
        location: payload.location ?? 'Home',
        frequency: payload.frequency,
        allowedFrequencies: [payload.frequency.type],
        reminder: payload.reminder ?? { enabled: false, time: '12:00 AM' },
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        showOnTodayScreen: payload.customDetails ? true : false,
        customDetails: payload.customDetails ?? null,
        parent: null,
        group: null,
        isLocked: false,
        infoContent: null,
        adhkarSet: null,
        quranContent: null,
        connectedHabits: [],
        isActive: true,
    });

    await HabitLog.create({
        user: userId,
        userHabit: newHabit._id,
        date,
        status: 'Pending',
    });

    return {
        _id: newHabit._id,
        name: newHabit.name,
    };
};

// ─────────────────────────────────────────────────────────────
//  4. SEARCH HABITS TO CONNECT
// ─────────────────────────────────────────────────────────────

const searchHabitsToConnect = async (
    user: IUser,
    userHabitId: string,
    searchTerm?: string,
) => {
    const userId = user._id as Types.ObjectId;

    // Parent habit validate করো
    const parentHabit = await UserHabit.findOne({
        _id: userHabitId,
        user: userId,
        isActive: true,
        habitType: 'obligatory_prayer',
    }).select('_id connectedHabits').lean();

    if (!parentHabit) throw new NotFoundError('Habit not found or not an obligatory prayer');

    // Already connected ids
    const alreadyConnectedIds = (parentHabit.connectedHabits ?? []).map(
        c => c.userHabit.toString(),
    );

    const filter: any = {
        user: userId,
        isActive: true,
        habitType: { $nin: ['obligatory_prayer', 'sunnah_prayer'] },
        _id: { $nin: [userHabitId, ...alreadyConnectedIds] },
    };

    if (searchTerm?.trim()) {
        filter.name = { $regex: new RegExp(searchTerm.trim(), 'i') };
    }

    const habits = await UserHabit.find(filter)
        .select('_id name category habitType')
        .limit(20)
        .lean();

    return habits.map(h => ({
        _id: h._id,
        name: h.name,
        category: h.category,
        habitType: h.habitType,
    }));
};



export const userHabitService = {
    toggleHabit,
    getTodayHabits,
    updateUserHabit,
    addCustomHabit,
    searchHabitsToConnect,
    getHabitDetail
};



/*
const ToggleHabit = async (user: IUser, habitId: string, isActive: boolean) => {
    const userId = user._id as Types.ObjectId;

    const today = new Date();
    const date = buildDateBasedOnTimeZone(today, user.timezone as string);

    // ─────────────────────────────────────────────────────────
    //  DEACTIVATE Habit
    // ─────────────────────────────────────────────────────────
    if (!isActive) {
        const childTemplates = await HabitTemplate.find({
            group: habitId,
            isActive: true,
        }).lean();

        const isGroup = childTemplates.length > 0;

        if (isGroup) {
            const activeHabits = await UserHabit.find({
                user: userId,
                template: { $in: childTemplates.map(c => c._id) },
                isActive: true,
            }).select('_id').lean();

            if (!activeHabits.length) {
                throw new BadRequestError('No active habits found in this group.');
            }

            const habitIds = activeHabits.map(h => h._id);

            await UserHabit.updateMany(
                { _id: { $in: habitIds } },
                { $set: { isActive: false } },
            );

            await HabitLog.updateMany(
                { userHabit: { $in: habitIds }, date, status: 'Pending' },
                { $set: { status: 'Skipped', skippedAt: new Date() } },
            );
            // ekahne deactivate korle ei habit ta je je obligatory prayer er connected habit chilo oigula thekeo disconnect hobe jemon Fajr er vitore fazr sunnah connected habit chilo, Fajr deactivate korle fazr sunnah thekeo disconnect hobe
            return null;
        }

        // Single habit deactivation
        const userHabit = await UserHabit.findOne({
            template: habitId,
            user: userId,
            isActive: true,
        });
        if (!userHabit) throw new BadRequestError('Habit not found or already deactivated');
        
        if(userHabit.parent){
          userHabit.parent = null;
        }

        userHabit.isActive = false;
        await userHabit.save();

        await HabitLog.findOneAndUpdate(
            { userHabit: userHabit._id, date, status: 'Pending' },
            { $set: { status: 'Skipped', skippedAt: new Date() } },
        );
        
         // ekahne single disconnect hobe jekhane jekhane ase 
        //  interface IConnectedHabit {
        //    userHabit: Types.ObjectId;
        //    order: number;
        //  }
        return null;
    }

    // ─────────────────────────────────────────────────────────
    //  ACTIVATE PATH
    // ─────────────────────────────────────────────────────────
    const template = await HabitTemplate.findById(habitId).lean();
    if (!template) throw new NotFoundError('Habit template not found');
    if (!template.isActive) throw new BadRequestError('This habit is no longer available');

    const childTemplates = await HabitTemplate.find({
        group: habitId,
        isActive: true,
    }).lean();
   
    console.log({childTemplates})
    const isGroup = childTemplates.length > 0;

    // ── CASE 1: Group template ──
    if (isGroup) {
        const existingHabits = await UserHabit.find({
            user: userId,
            template: { $in: childTemplates.map(c => c._id) },
        }).select('template isActive _id parent').lean();
        console.log({existingHabits})
        const existingMap = new Map(
            existingHabits.map(h => [h.template?.toString(), h]),
        );
        console.log({existingMap})
        const toReactivate: Types.ObjectId[] = [];
        const toCreate: typeof childTemplates = [];

        for (const child of childTemplates) {
            const existing = existingMap.get(child._id.toString());
            if (!existing) {
                toCreate.push(child);
            } else if (!existing.isActive) {
                toReactivate.push(existing._id);
            }
            // already active → skip silently
        }
        console.log({toReactivate, toCreate})
        if (!toReactivate.length && !toCreate.length) {
            throw new BadRequestError('You have already added all habits from this group.');
        }

        // Reactivate soft-deleted habits
        if (toReactivate.length) {
            await UserHabit.updateMany(
                { _id: { $in: toReactivate } },
                { $set: { isActive: true, startDate: new Date() } },
            );

            // Today log already আছে কিনা check (Skipped হয়ে থাকতে পারে)
            const existingLogs = await HabitLog.find({
                userHabit: { $in: toReactivate },
                date,
            }).select('userHabit status').lean();

            const existingLogMap = new Map(
                existingLogs.map(l => [l.userHabit?.toString(), l]),
            );

            const logsToInsert: Types.ObjectId[] = [];

            for (const id of toReactivate) {
                const existingLog = existingLogMap.get(id.toString());
                if (!existingLog) {
                    logsToInsert.push(id);
                } else if (existingLog.status === 'Skipped') {
                    // Skipped → Pending এ ফিরিয়ে আনো
                    await HabitLog.updateOne(
                        { userHabit: id, date},
                        { $set: { status: 'Pending', skippedAt: null } },
                    );
                }
            }
            console.log({ logsToInsert });
            if (logsToInsert.length) {
                await HabitLog.insertMany(
                    logsToInsert.map(id => ({
                        user: userId,
                        userHabit: id,
                        date,
                        status: 'Pending',
                    })),
                );
            }
        }



        // Create brand new habits (with isLocked check)
        const skippedNames: string[] = [];
        const canAdd: typeof toCreate = [];
        const parentList = [];
        for (const child of toCreate) {
            if (child.parent) {
                const parentActive = await UserHabit.exists({
                    user: userId,
                    template: child.parent,
                    isActive: true,
                });
                
                if (!parentActive) {
                    skippedNames.push(child.name);
                    continue;
                }
            }
            canAdd.push(child);
            parentList.push(child.parent);
        }

        if (!canAdd.length && !toReactivate.length) {
            throw new BadRequestError(
                `Activate the obligatory prayers first to unlock: ${skippedNames.join(', ')}`,
            );
        }
        
        // ekhane ei habit gula 
        let newHabits: any[] = [];
        if (canAdd.length) {
            const payloads = canAdd.map(t => buildHabitPayload(userId, t));
            newHabits = await UserHabit.insertMany(payloads);
            
            const parentHabits = await UserHabit.find({
                user: userId,
                template: { $in: parentList },
                isActive: true,
            }).select('_id template').lean();
             // ekahne parents habit er vitore connected habit er je new habits ase oigula add hobe jemon Fajr er vitore fazr sunnah connected habit e thakbe
             
            const parentHabitMap = new Map(
                    parentHabits.map(h => [h.template?.toString(), h._id]),
                );
                console.log({parentHabitMap})
                const connectedHabitsToUpdate: { id: Types.ObjectId, connectedHabits: IConnectedHabit }[] = [];

            await HabitLog.insertMany(
                newHabits.map(h => ({
                    user: userId,
                    userHabit: h._id,
                    date,
                    status: 'Pending',
                })),
            );
        }

        return {
            added: newHabits.map(h => ({ _id: h._id, name: h.name })),
            reactivated: toReactivate.map(id => ({ _id: id })),
            skipped: skippedNames.length
                ? `${skippedNames.join(', ')} skipped — activate their obligatory prayers first`
                : null,
        };
    }

    // ── CASE 2: Single template ──
    const existingHabit = await UserHabit.findOne({
        user: userId,
        template: habitId,
    });

    if (existingHabit) {
        if (existingHabit.isActive) {
            throw new BadRequestError('You have already added this habit.');
        }

        // Reactivate soft-deleted habit
        existingHabit.isActive = true;
        existingHabit.startDate = new Date();
        await existingHabit.save();

        const existingLog = await HabitLog.findOne({
            userHabit: existingHabit._id,
            date,
        });
  
        if (existingLog) {
            // Had Skipped  → Bring Pending 
            if (existingLog.status === 'Skipped') {
                existingLog.status = 'Pending';
                existingLog.skippedAt = null;
                await existingLog.save();
            }
        } else {
            // has no log  → crate new
            await HabitLog.create({
                user: userId,
                userHabit: existingHabit._id,
                date,
                status: 'Pending',
            });
        }

        return { added: [{ _id: existingHabit._id, name: existingHabit.name }], skipped: null };
    }

    // No existing habit — create fresh
    // if (template.isLocked && template.connectedPrayer) {
    //     const parentActive = await UserHabit.exists({
    //         user: userId,
    //         habitType: 'obligatory_prayer',
    //         connectedPrayer: template.connectedPrayer,
    //         isActive: true,
    //     });

    //     if (!parentActive) {
    //         throw new BadRequestError(
    //             `Activate ${template.connectedPrayer} prayer first to unlock this habit`,
    //         );
    //     }
    // }

    const newHabit = await UserHabit.create(buildHabitPayload(userId, template));

    await HabitLog.create({
        user: userId,
        userHabit: newHabit._id,
        date,
        status: 'Pending',
    });

    return { added: [{ _id: newHabit._id, name: newHabit.name }], skipped: null };
};

*/