import { Types } from "mongoose";
import { Bug } from "../../bug/bug.model";
import User from "../../user/user.model";
import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import { TBugUpdatePayload } from "./bug.zod";


const getAllBugs = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, searchTerm, status, plan } = query;

    const matchStage: any = {};
    
    // Status and plan filters
    if (status) matchStage.status = status;
    if (plan) matchStage.plan = plan;

    // Search Term logic
    if (searchTerm) {
        matchStage.$or = [
            { title: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    const result = await Bug.aggregate([
        { $match: matchStage },
        {
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: (Number(page) - 1) * Number(limit) },
                    { $limit: Number(limit) },
                    // 1. Original Reporter-এর ডেটা User কালেকশন থেকে আনা হচ্ছে
                    {
                        $lookup: {
                            from: 'users', // আপনার User কালেকশনের আসল নাম দিন (обычно 'users')
                            localField: 'originalReporter',
                            foreignField: '_id',
                            as: 'reporterInfo'
                        }
                    },
                    // 2. UpvotedBy অ্যারে-র ডেটা User কালেকশন থেকে আনা হচ্ছে
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'upvotedBy',
                            foreignField: '_id',
                            as: 'upvotedByInfo'
                        }
                    },
                    // reporterInfo অ্যারে-কে অবজেক্টে রূপান্তর করা হচ্ছে
                    {
                        $unwind: {
                            path: '$reporterInfo',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    // ডেটা ফরম্যাটিং এবং রেসপন্স ফ্ল্যাট করা হচ্ছে
                    {
                        $project: {
                            _id: 0,
                            featureKey: 1,
                            title: 1,
                            status: 1,
                            upvoteCount: 1,
                            createdAt: 1,
                            // ফ্ল্যাট ফিল্ডস
                            originalReporterName: { $ifNull: ['$reporterInfo.fullName', ''] }, 
                        },
                    },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ]);

    const bugsData = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;

    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
        data: bugsData,
    };
};


const getBugDetails = async (bugId: string) => {
    const bug = await Bug.aggregate([
        { 
            $match: { _id: new Types.ObjectId(bugId) } 
        },
        {
            $lookup: {
                from: 'users', // আপনার User কালেকশনের নাম
                localField: 'originalReporter',
                foreignField: '_id',
                as: 'reporterInfo'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'upvotedBy',
                foreignField: '_id',
                as: 'upvotedByInfo'
            }
        },
        {
            $unwind: {
                path: '$reporterInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                featureKey: 1,
                title: 1,
                description: 1,
                status: 1,
                upvoteCount: 1,
                bugImages: { $ifNull: ['$bugImages', []] },
                createdAt: 1,
                // ফ্ল্যাট রেসপন্স
                originalReporterName: { $ifNull: ['$reporterInfo.fullName', ''] },
                originalReporterEmail: { $ifNull: ['$reporterInfo.email', ''] },
            }
        }
    ]);

    if (!bug || bug.length === 0) {
        throw new NotFoundError("Bug not found");
    }

    return bug[0];
};


const updateBugStatus = async (bugId: string, payload: TBugUpdatePayload) => {

    const updatedBug = await Bug.findByIdAndUpdate(
        bugId,
        { $set: { status: payload.status } },
        { new: true, runValidators: true }
    ).select('featureKey title status updatedAt'); 

    if (!updatedBug) {
        throw new BadRequestError("Bug not found to update status");
    }

    return updatedBug;
};

export const bugService = {
    getAllBugs,
    getBugDetails,
    updateBugStatus
}