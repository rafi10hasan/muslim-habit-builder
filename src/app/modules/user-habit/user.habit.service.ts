import moment from 'moment-timezone';
import mongoose, { Types } from 'mongoose';
import { ConnectedPrayer, HabitCategory } from '../../../interfaces';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { AdhkarSet } from '../adhkar-set/adhkar.set.model';

import { LOG_STATUS } from '../habit-logger/habit.logger.constant';
import { HabitLog } from '../habit-logger/habit.logger.model';
import { HABIT_TYPES } from '../habit-template/system.habit.constant';
import { HabitTemplate } from '../habit-template/system.habit.model';
import { QuranContent } from '../quran-content/quran.content.model';
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

    allowConnectedPrayers: template.allowConnectedPrayers ?? [],
    // Location

    location: template.supportsLocation ?? null,

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
        type: template.defaultFrequency.type ?? FREQUENCY_TYPES.DAILY,
        selectedDays: template.defaultFrequency.selectedDays ?? [],
        everyNDays: template.defaultFrequency.everyNDays ?? undefined,
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
    const date = buildDateBasedOnTimeZone(user.timezone as string);

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
                { userHabit: { $in: habitIds }, date: String(date), status: LOG_STATUS.PENDING },
                { $set: { status: LOG_STATUS.SKIPPED, skippedAt: new Date() } },
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
                { userHabit: customHabit._id, date: String(date), status: LOG_STATUS.PENDING },
                { $set: { status: LOG_STATUS.SKIPPED, skippedAt: new Date() } },
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
                { userHabit: userHabit._id, date: String(date), status: 'Pending' },
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
            date: String(date),
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
                date: String(date),
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
                date: String(date),
            }).select('userHabit status').lean();

            const existingLogMap = new Map<string, any>(
                existingLogs.map((l: any) => [l.userHabit?.toString(), l]),
            );

            const logsToInsert: Types.ObjectId[] = [];

            for (const id of toReactivate) {
                const existingLog = existingLogMap.get(id.toString());
                if (!existingLog) {
                    logsToInsert.push(id);
                } else if (existingLog.status === 'Skipped') {
                    await HabitLog.updateOne(
                        { userHabit: id, date: String(date) },
                        { $set: { status: 'Pending', skippedAt: null } },
                    );
                }
            }

            if (logsToInsert.length) {
                await HabitLog.insertMany(
                    logsToInsert.map(id => ({
                        user: userId,
                        userHabit: id,
                        date: String(date),
                        status: 'Pending',
                    })),
                );
            }

            // Reactivated habits কে parent এর connectedHabits এ reconnect করো
            const reactivatedTemplates = await HabitTemplate.find({
                _id: { $in: toReactivateWithTemplate.map(r => r.templateId) },
            }).select('_id parent').lean();

            const reactivatedTemplateMap = new Map<string, any>(
                reactivatedTemplates.map((t: any) => [t._id.toString(), t]),
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
            console.log({canAdd})
            const payloads = canAdd.map(t => buildHabitPayload(userId, t));
            newHabits = await UserHabit.insertMany(payloads);

            await HabitLog.insertMany(
                newHabits.map(h => ({
                    user: userId,
                    userHabit: h._id,
                    date: String(date),
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

        if (template.connectedHabits?.length) {
    
            for (let i = 0; i < newHabits.length; i++) {

                const childUserHabit = newHabits[i];        // e.g. Fajr UserHabit

                const connectedHabitIds: { userHabit: Types.ObjectId; order: number }[] = [];

                for (const ch of template.connectedHabits) {
                    // templateId দিয়ে connected template fetch
                    const connectedTemplate = await HabitTemplate.findById(ch.templateHabit).lean();
                    console.log({ connectedTemplate })
                    if (!connectedTemplate || !connectedTemplate.isActive) continue;


                    // AdhkarAfterPrayer(Fajr) ≠ AdhkarAfterPrayer(Dhuhr)
                    let connectedUserHabit = await UserHabit.findOne({
                        user: userId,
                        template: ch.templateHabit,
                        isActive: true,
                    }).lean();

                    console.log({ connectedUserHabit })
                    if (!connectedUserHabit) {
                        // isPrayerLocked check
                        if (connectedTemplate.isPrayerLocked) {
                            const prayerActive = await UserHabit.exists({
                                user: userId,
                                isActive: true,
                            });
                            if (!prayerActive) continue;
                        }

                        // Step A: আগে connected habit তৈরি করো
                        connectedUserHabit = await UserHabit.create(
                            buildHabitPayload(userId, connectedTemplate) as any,
                        );

                        console.log({ connectedUserHabit })
                        await HabitLog.create({
                            user: userId,
                            userHabit: connectedUserHabit._id,
                            date: String(date),
                            status: 'Pending',
                        });
                    }

                    const currentFreshHabit = await UserHabit.findById(childUserHabit._id).lean();
                    const currentConnected = currentFreshHabit?.connectedHabits || [];
                    const lastOrder = currentConnected[currentConnected.length - 1]?.order ?? 0;

                    // Step B: তারপর child এর connectedHabits array তে add
                    connectedHabitIds.push({
                        userHabit: connectedUserHabit._id,
                        order: lastOrder ? lastOrder + 1 : 1,
                    });
                }

                console.log({ childUserHabit, connectedHabitIds });

                // DB তে save — child UserHabit এর connectedHabits update
                if (connectedHabitIds.length) {
                    await UserHabit.findByIdAndUpdate(childUserHabit._id, {
                        $push: { connectedHabits: { $each: connectedHabitIds } },
                    });
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
            date: String(date),
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
                date: String(date),
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
        date: String(date),
        status: 'Pending',
    });

    // Parent এর connectedHabits এ connect করো
    if (template.parent) {
        await connectToParent(userId, template.parent, newHabit._id);
    }

    return { added: [{ _id: newHabit._id, name: newHabit.name }], skipped: null };
};



const getTodayHabits = async (user: IUser, category?: string) => {
    const userId = user._id as Types.ObjectId;

    // 1. 'date' variable is now a pure string (e.g., "2026-05-21")
    const dateStr = buildDateBasedOnTimeZone(user.timezone as string);

    // Get today's day name (mon, tue, wed...)
    const todayDayName = moment(dateStr)
        .format('ddd')
        .toLowerCase() as WeekDay;

    // Fetch all active habits first to identify connected habit IDs
    const allActiveHabits = await UserHabit.find({
        user: userId,
        isActive: true,
    }).select('_id connectedHabits').lean();

    // Store all connected habit IDs inside a Set for faster lookup
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
        .select('_id name category connectedHabits habitType infoContent adhkarSet quranContent customDetails frequency startDate')
        .populate({
            path: 'connectedHabits.userHabit',
            select: '_id name category frequency startDate adhkarSet quranContent customDetails infoContent habitType',
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

                const start = moment(startDate).startOf('day');
                const today = moment(dateStr).startOf('day');

                const diffDays = today.diff(start, 'days');

                return diffDays >= 0 && diffDays % frequency.everyNDays === 0;
            }

            default:
                return true;
        }
    };

    // Filter parents based on frequency
    const todayHabits = habits.filter(h => shouldShowToday(h.frequency, h.startDate));

    const allUserHabitIds = todayHabits.map(h => h._id);
    const connectedIds = todayHabits.flatMap(h =>
        (h.connectedHabits ?? [])
            .filter((c: any) => {
                const child = c.userHabit;
                return child?.frequency
                    ? shouldShowToday(child.frequency, child.startDate)
                    : true;
            })
            .map((c: any) => c.userHabit?._id ?? c.userHabit),
    );

    const allIds = [...allUserHabitIds, ...connectedIds];

    // Fetch existing habit logs for today using pure string date
    const existingLogs = await HabitLog.find({
        userHabit: { $in: allIds },
        date: dateStr,
    }).select('userHabit status').lean();

    const logMap = new Map<string, any>(
        existingLogs.map((l: any) => [l.userHabit?.toString(), l.status]),
    );

    // Create logs for missing entries
    const missingLogIds = allIds.filter(id => !logMap.has(id.toString()));
    if (missingLogIds.length) {
        await HabitLog.insertMany(
            missingLogIds.map(id => ({
                user: userId,
                userHabit: id,
                date: dateStr,
                status: 'Pending',
            })),
        );
        missingLogIds.forEach(id => logMap.set(id.toString(), 'Pending'));
    }

    // ─────────────────────────────────────────────────────────
    //  RESPONSE BUILD (FIXED WITH ALL DATA FIELDS)
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
                const childId = child?._id?.toString() ?? c.userHabit?.toString();

                return {
                    _id: child?._id ?? c.userHabit,
                    name: child?.name ?? null,
                    category: child?.category ?? null,
                    habitType: child?.habitType ?? null,
                    infoContent: child?.infoContent ?? null,
                    customDetails: child?.customDetails ?? null,
                    adhkarSet: child?.adhkarSet ?? null,
                    quranContent: child?.quranContent ?? null,
                    frequency: child?.frequency ?? null,
                    startDate: child?.startDate ?? null,
                    order: c.order,
                    status: logMap.get(childId) ?? 'Pending',
                };
            });

        const databaseParentStatus = logMap.get(h._id.toString()) ?? 'Pending';

        // 🚀 ABSOLUTE SET COMPLETION ENGINE (Strict Parent & All Children Match)
        let finalDisplayStatus = 'Pending';

        if (connectedHabits.length > 0) {
            // ১. Check koro parent nijje complete kina
            const isParentCompleted = databaseParentStatus === 'Completed';

            // ২. Check koro shobgulo child complete kina
            const areAllChildrenCompleted = connectedHabits.every(ch => ch.status === 'Completed');

            // 🎯 Rule: Parent EBONG Shob Child complete holei kebol display state 'Completed' hobe
            if (isParentCompleted && areAllChildrenCompleted) {
                finalDisplayStatus = 'Completed';
            } else if (databaseParentStatus === 'Skipped') {
                // Buffer condition: Jodi parent overall manually skipped mark kora thake
                finalDisplayStatus = 'Skipped';
            } else {
                // Je kono ekta complete na thakle conditional fallback mapping state hobe 'Pending'
                finalDisplayStatus = 'Pending';
            }
        } else {
            // ৩. Connected habits na thakle parent control standard-ei kaj korbe
            finalDisplayStatus = databaseParentStatus;
        }

        return {
            _id: h._id,
            name: h.name,
            category: h.category,
            habitType: h.habitType,
            infoContent: h.infoContent,
            customDetails: h.customDetails,
            adhkarSet: h.adhkarSet,
            quranContent: h.quranContent,
            status: finalDisplayStatus, // Strictly maps to full set completion status
            connectedHabits,
        };
    });

    // ─────────────────────────────────────────────────────────
    //  SUMMARY GENERATION (STRICT TOTAL MATCH)
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
    console.log({ payload })
    const habit = await UserHabit.findOne({
        _id: userHabitId,
        user: userId,
        isActive: true,
    });
    if (!habit) throw new NotFoundError('Habit not found');

    if (!habit.isPreBuilt) {
        habit.name = payload.name ?? habit.name;
        habit.category = (payload.category as HabitCategory) ?? habit.category;
        habit.connectedPrayer = (payload.connectedPrayer as ConnectedPrayer) ?? habit.connectedPrayer;
        habit.customDetails = payload.customDetails ?? habit.customDetails;
    }

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
    if (payload.reminder !== undefined) habit.reminder = payload.reminder as any;
    

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

    if (payload.customDetails !== undefined || habit.customDetails !== "") {
        habit.customDetails = payload.customDetails;
    }
    

    if ( payload.connectedHabits && payload.connectedHabits.length > 0) {
        if (habit.habitType !== 'obligatory_prayer') {
            throw new BadRequestError('Only obligatory prayers can have connected habits');
        }

        const inputIds = payload.connectedHabits; // Full array of IDs the frontend wants to keep/add
        const existingConnectedHabits = habit.connectedHabits ?? [];

        // 1. Separate out what needs to be REMOVED vs what is NEW
        const existingIds = existingConnectedHabits.map(c => c.userHabit.toString());

        // IDs in existing but NOT in inputIds are being removed
        const idsToRemove = existingIds.filter(id => !inputIds.includes(id));
        // IDs in inputIds but NOT in existing are new additions
        const uniqueNewIds = inputIds.filter(id => !existingIds.includes(id));

        // 2. Handle Removals: Clear their parent template in the database
        if (idsToRemove.length) {
            await UserHabit.updateMany(
                { _id: { $in: idsToRemove }, user: userId },
                { $unset: { parent: "" } } // or $set: { parent: null } depending on your schema
            );
        }

        // 3. Handle Additions & Validations
        if (uniqueNewIds.length) {
            const validHabits = await UserHabit.find({
                _id: { $in: uniqueNewIds },
                user: userId,
                isActive: true,
            }).select('_id').lean();

            if (validHabits.length !== uniqueNewIds.length) {
                throw new BadRequestError('One or more connected habits are invalid or inactive');
            }

            // Set parent template for new additions
            await UserHabit.updateMany(
                { _id: { $in: uniqueNewIds }, user: userId },
                { $set: { parent: habit.template } },
            );
        }

        // 4. Build the final array maintaining original orders or re-sequencing everything
        // Filter out the deleted habits from the local subdocument array first
        let updatedConnectedHabits = existingConnectedHabits.filter(
            item => !idsToRemove.includes(item.userHabit.toString())
        );

        // Find the max order among remaining items
        const maxOrder = updatedConnectedHabits.reduce(
            (max, item) => (item.order > max ? item.order : max),
            0
        );

        // Map new items sequentially
        const formattedNewHabits = uniqueNewIds.map((id, index) => ({
            userHabit: new Types.ObjectId(id),
            order: maxOrder + index + 1,
        }));

        // 5. Save the final state back to the habit document
        habit.connectedHabits = [...updatedConnectedHabits, ...formattedNewHabits];
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
    console.log({ habit })
    if (!habit) throw new NotFoundError('Habit not found or habit is not active');

    const isObligatoryPrayer = habit.habitType === HABIT_TYPES.OBLIGATORY_PRAYER;

    return {
        _id: habit._id,
        name: habit.name,
        category: habit.category,
        habitType: habit.habitType,
        connectedPrayer: habit.connectedPrayer ?? null,
        isPrayerLocked: habit.isPrayerLocked ?? false,
        location: habit.location ?? null,
        frequency: habit.frequency,
        isPreBuilt: habit.isPreBuilt,
        allowedFrequencies: habit.allowedFrequencies,
        reminder: habit.reminder,
        startDate: habit.startDate,
        showOnTodayScreen: habit.showOnTodayScreen,
        isLocked: habit.isLocked,
        customDetails: habit.customDetails ?? null,
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

    console.log({ payload })

    const userId = user._id as Types.ObjectId;
    const date = buildDateBasedOnTimeZone(user.timezone as string);


    // Duplicate name check for this user
    const duplicate = await UserHabit.exists({
        user: userId,
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') },
    });

    if (duplicate) throw new BadRequestError('You already have a habit with this name');

    console.log({ payload })

    const newHabit = await UserHabit.create({
        user: userId,
        template: null,
        name: payload.name.trim(),
        category: payload.category,
        isPrayerLocked: false,
        isPreBuilt: false,
        connectedPrayer: payload.connectedPrayer ?? null,
        frequency: payload.frequency,
        allowedFrequencies: [FREQUENCY_TYPES.DAILY, FREQUENCY_TYPES.WEEKLY, FREQUENCY_TYPES.EVERY_N_DAYS],
        reminder: payload.reminder ?? { enabled: false, time: '12:00 AM' },
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        showOnTodayScreen: payload.customDetails ? true : false,
        customDetails: payload.customDetails ?? null,
        parent: null,
        group: null,
        isLocked: false,
        isActive: true,
        infoContent: null,
        adhkarSet: null,
        quranContent: null,
        connectedHabits: [],
    });

    await HabitLog.create({
        user: userId,
        userHabit: newHabit._id,
        date: String(date),
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
        habitType: HABIT_TYPES.OBLIGATORY_PRAYER,
    }).select('_id connectedHabits allowConnectedPrayers connectedPrayer').lean();
   
    console.log({ parentHabit })

    if (!parentHabit) throw new NotFoundError('Habit not found or not an obligatory prayer');

    // Already connected ids
    const alreadyConnectedIds = (parentHabit.connectedHabits ?? []).map(
        c => c.userHabit.toString(),
    );

    const filter: any = {
        user: userId,
        isActive: true,
        habitType: { $nin: [HABIT_TYPES.OBLIGATORY_PRAYER, HABIT_TYPES.SUNNAH_PRAYER] },
        allowConnectedPrayers: { $in: [parentHabit.connectedPrayer] },
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

const deleteCustomHabit = async (user: IUser, habitId: string) => {

    const habit = await UserHabit.findById(habitId);
    if (!habit) {
        throw new NotFoundError('Habit not found');
    }
    if (habit.isPreBuilt) {
        throw new BadRequestError('Pre built habits cannot be deleted');
    }
    if (habit.user.toString() !== user._id.toString()) {
        throw new BadRequestError('You can only delete your own habits');
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        // 1. Delete the habit
        await UserHabit.deleteOne({ _id: habitId }, { session });
        // 2. Delete associated habit logs
        await HabitLog.deleteMany({ userHabit: habitId }, { session });
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }

};

// completed habit 
const completedHabit = async (user: IUser, habitId: string) => {

    const userId = user._id;
    const dateStr = buildDateBasedOnTimeZone(user.timezone as string);
    // Database entry khujo ba update koro

    const habit = await UserHabit.findById(habitId);
    if (!habit) {
        throw new NotFoundError('Habit not found');
    }

    let log = await HabitLog.findOne({
        user: userId,
        userHabit: habitId,
        date: dateStr
    });

    if (!log) {
        // Fresh initialization line setup tracking
        log = new HabitLog({
            user: userId,
            userHabit: habitId,
            date: dateStr,
            status: LOG_STATUS.PENDING // Initial state setting
        });
    }

    // ─────────────────────────────────────────────────────────
    //  TOGGLE CORE LOGIC ENGINE
    // ─────────────────────────────────────────────────────────
    if (log.status === LOG_STATUS.COMPLETED) {
        // If already Completed, toggle back to Pending state
        log.status = LOG_STATUS.PENDING;
        log.completedAt = null;
        log.skippedAt = null;
        log.locationLogged = null; // Reset location data if required
    } else {
        // If Pending or Skipped, transition directly to Completed
        log.status = LOG_STATUS.COMPLETED;
        log.completedAt = new Date();
        log.skippedAt = null; // Clear skip tracking if it was skipped before
    }
    await log.save();
    return log;
}

// skipped habit
const skippedHabit = async (user: IUser, habitId: string) => {

    const userId = user._id;
    const dateStr = buildDateBasedOnTimeZone(user.timezone as string);
    // Database entry khujo ba update koro

    const habit = await UserHabit.findById(habitId).select('_id');
    if (!habit) {
        throw new NotFoundError('Habit not found');
    }

    let log = await HabitLog.findOne({
        user: userId,
        userHabit: habitId,
        date: dateStr
    });

    if (!log) {
        // Fresh initialization line setup tracking
        log = new HabitLog({
            user: userId,
            userHabit: habitId,
            date: dateStr,
            status: LOG_STATUS.PENDING // Initial state setting
        });
    }

    // ─────────────────────────────────────────────────────────
    //  TOGGLE CORE LOGIC ENGINE
    // ─────────────────────────────────────────────────────────
    if (log.status === LOG_STATUS.SKIPPED) {
        // If already Skipped, toggle back to Pending state
        log.status = LOG_STATUS.PENDING;
        log.skippedAt = null;
        log.locationLogged = null; // Reset location data if required
    } else {
        // If Pending or Skipped, transition directly to Skipped
        log.status = LOG_STATUS.SKIPPED;
        log.skippedAt = new Date();
    }
    await log.save();
    return log;
}

// get content
const getDynamicHabitContent = async (user: IUser, contentId: string) => {

    const quranData = await QuranContent.findById(contentId).lean();
    console.log({ quranData })
    // ১. Quran content check matrix mapping parsing query log format
    if (quranData) {
        return quranData
    }
    const adhkarData = await AdhkarSet.findById(contentId).lean();
    console.log({ adhkarData })
    // ২. Adhkar set content data tracking verification flow
    if (adhkarData) {
        return adhkarData
    }
    console.log("Mongoose registered collection names:", mongoose.connection.modelNames());
    // ৩. Error logging block framework handling standard query match exception
    throw new NotFoundError('Content details not found in either Quran or Adhkar records');

};

export const userHabitService = {
    toggleHabit,
    getTodayHabits,
    updateUserHabit,
    addCustomHabit,
    searchHabitsToConnect,
    getHabitDetail,
    deleteCustomHabit,
    completedHabit,
    skippedHabit,
    getDynamicHabitContent,
};




/*
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



// get Today habit
// const getTodayHabits = async (user: IUser, category?: string) => {
//     const userId = user._id as Types.ObjectId;

//     // ১. 'date' variable টা এখন পিওর স্ট্রিং (e.g., "2026-05-21")
//     const dateStr = buildDateBasedOnTimeZone(user.timezone as string);

//     // Today's day name বের করো (mon, tue, wed...)
//     const todayDayName = moment(dateStr)
//         .format('ddd')
//         .toLowerCase() as WeekDay;

//     // আগে সব active habits আনো connected ids বের করতে
//     const allActiveHabits = await UserHabit.find({
//         user: userId,
//         isActive: true,
//     }).select('_id connectedHabits').lean();

//     // সব connected habit ids একটা Set এ রাখো
//     const connectedHabitIds = new Set(
//         allActiveHabits.flatMap(h =>
//             (h.connectedHabits ?? []).map((c: any) => c.userHabit?.toString()),
//         ),
//     );

//     const filter: any = {
//         user: userId,
//         isActive: true,
//         _id: { $nin: [...connectedHabitIds] },
//     };

//     if (category && category.toLowerCase() !== 'all') {
//         filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
//     }

//     const habits = await UserHabit.find(filter)
//         .select('_id name category connectedHabits habitType infoContent adhkarSet quranContent customDetails frequency startDate')
//         .populate({
//             path: 'connectedHabits.userHabit',
//             select: '_id name category frequency startDate adhkarSet quranContent customDetails infoContent',
//         })
//         .sort({ displayOrder: 1 })
//         .lean();

//     // ─────────────────────────────────────────────────────────
//     //  FREQUENCY CHECK HELPER (FIXED)
//     // ─────────────────────────────────────────────────────────
//     const shouldShowToday = (frequency: IFrequency, startDate: Date): boolean => {
//         switch (frequency.type) {
//             case FREQUENCY_TYPES.DAILY:
//                 return true;

//             case FREQUENCY_TYPES.WEEKLY: {
//                 if (!frequency.selectedDays?.length) return false;
//                 return frequency.selectedDays.includes(todayDayName);
//             }

//             case FREQUENCY_TYPES.EVERY_N_DAYS: {
//                 if (!frequency.everyNDays) return false;

//                 // .getTime() এর ঝামেলা বাদ দিয়ে moment.diff দিয়ে নিখুঁত দিন বের করা হলো
//                 const start = moment(startDate).startOf('day');
//                 const today = moment(dateStr).startOf('day');

//                 const diffDays = today.diff(start, 'days');

//                 // startDate থেকে diffDays, everyNDays এর multiple হলে show করো
//                 return diffDays >= 0 && diffDays % frequency.everyNDays === 0;
//             }

//             default:
//                 return true;
//         }
//     };

//     // Frequency filter — আজকের জন্য না হলে বাদ
//     const todayHabits = habits.filter(h => shouldShowToday(h.frequency, h.startDate));

//     const allUserHabitIds = todayHabits.map(h => h._id);
//     const connectedIds = todayHabits.flatMap(h =>
//         (h.connectedHabits ?? [])
//             .filter((c: any) => {
//                 const child = c.userHabit;
//                 // Connected habit এর frequency ও check করো
//                 return child?.frequency
//                     ? shouldShowToday(child.frequency, child.startDate)
//                     : true;
//             })
//             .map((c: any) => c.userHabit?._id ?? c.userHabit),
//     );

//     const allIds = [...allUserHabitIds, ...connectedIds];

//     // Today এর existing logs আনো (FIXED: String(date) এর বদলে direct dateStr)
//     const existingLogs = await HabitLog.find({
//         userHabit: { $in: allIds },
//         date: dateStr, // জাদুকরী লাইন, স্ট্রিং দিয়ে পারফেক্ট কুয়েরি হবে
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
//                 date: dateStr, // Direct clean string save
//                 status: 'Pending',
//             })),
//         );
//         missingLogIds.forEach(id => logMap.set(id.toString(), 'Pending'));
//     }

//     // ─────────────────────────────────────────────────────────
//     //  RESPONSE BUILD
//     // ─────────────────────────────────────────────────────────
//     const result = todayHabits.map(h => {
//         const connectedHabits = (h.connectedHabits ?? [])
//             .filter((c: any) => {
//                 const child = c.userHabit;
//                 return child?.frequency
//                     ? shouldShowToday(child.frequency, child.startDate)
//                     : true;
//             })
//             .sort((a: any, b: any) => a.order - b.order)
//             .map((c: any) => {
//                 const child = c.userHabit;
//                 const childId = child?._id?.toString() ?? child?.toString();
//                 return {
//                     _id: child?._id ?? child,
//                     name: child?.name ?? null,
//                     status: logMap.get(childId) ?? 'Pending',
//                 };
//             });

//         const parentStatus = logMap.get(h._id.toString()) ?? 'Pending';

//         return {
//             _id: h._id,
//             name: h.name,
//             category: h.category,
//             habitType: h.habitType,
//             infoContent: h.infoContent,
//             customDetails: h.customDetails,
//             adhakarSet: h.adhkarSet,
//             quranContent: h.quranContent,
//             status: parentStatus,
//             connectedHabits,
//         };
//     });

//     // ─────────────────────────────────────────────────────────
//     //  SUMMARY
//     // ─────────────────────────────────────────────────────────
//     const total = result.length;
//     const completed = result.filter(h => h.status === 'Completed').length;
//     const pending = result.filter(h => h.status === 'Pending').length;
//     const skipped = result.filter(h => h.status === 'Skipped').length;

//     const completedHabits = result
//         .filter(h => h.status === 'Completed')
//         .map(h => ({ _id: h._id, name: h.name }));

//     return {
//         summary: {
//             total,
//             completed,
//             pending,
//             skipped,
//             label: `${completed} of ${total} completed`,
//         },
//         completedToday: completedHabits,
//         habits: result,
//     };
// };

*/


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
                existingLogs.map((l: any) => [l.userHabit?.toString(), l]),
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