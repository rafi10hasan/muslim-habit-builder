
export const ANNOUNCEMENT_STATUS = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  SCHEDULED: "Scheduled",
} as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUS)[keyof typeof ANNOUNCEMENT_STATUS];