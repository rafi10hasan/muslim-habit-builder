import { Types } from "mongoose";

export interface IBug{
    
    _id:Types.ObjectId;
    reporter: Types.ObjectId;
    title: string;
    description: string;
    isSolved: boolean;
    bugImages: string[];
    createdAt: Date;
    updatedAt: Date;
}