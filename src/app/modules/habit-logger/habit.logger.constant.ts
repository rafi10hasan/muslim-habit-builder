
export const LOG_STATUS = {
  PENDING: "Pending",
  SKIPPED: "Skipped",
  COMPLETED: "Completed",
} as const;
export type HabitStatus = (typeof LOG_STATUS)[keyof typeof LOG_STATUS];