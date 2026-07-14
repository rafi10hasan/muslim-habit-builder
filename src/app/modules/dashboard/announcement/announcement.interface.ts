



export interface IAnnouncement extends Document{
    
title: string;

description: string;

startedAt: Date | null;

endedAt: Date | null;

status: string | null;

createdAt: Date;

updatedAt: Date;

}