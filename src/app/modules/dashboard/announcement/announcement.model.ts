import { model, Schema } from "mongoose";

import { ANNOUNCEMENT_STATUS } from "./announcement.constant";
import { IAnnouncement } from "./announcement.interface";



const announcementSchema = new Schema<IAnnouncement>({
 
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(ANNOUNCEMENT_STATUS),
        default: ANNOUNCEMENT_STATUS.SCHEDULED
    },
    startedAt: {
        type: Date,
        required: true,
        default: null,
    },
    endedAt: {
        type: Date,
        required: true,
        default: null,
    },
  
},
{
    timestamps: true,
    versionKey: false
}

);

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);

/*


export interface IAnnouncement extends Document{
    
title: string;

description: string;

startedAt: Date | null;

endedAt: Date | null;

status: string | null;

createdAt: Date;

updatedAt: Date;

}

*/