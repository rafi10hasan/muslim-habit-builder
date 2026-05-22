import { Types } from "mongoose";

export interface IBug{
    
    _id:Types.ObjectId;
    reporter: Types.ObjectId;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'resolved';
    bugImages: string[];
    createdAt: Date;
    updatedAt: Date;
    
}