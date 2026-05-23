

export const BUG_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved'
} as const;

export const BUG_FEATURES = {
  
  APP_CRASH: "app crash",  
  PERFORMANCE_ISSUE: "performance issue",
  DATA_LOSS: "data loss",
  NOTIFICATION_ISSUE: "notification issue",
  SYNC_PROBLEM: "sync problem",
  SIGNUP:"signup is not working",
  LOGIN_IS_NOT_WORKING:"login is not working",
  GUEST_LOGIN_IS_NOT_WORKING: "guest login is not working",
  UPDATE_PROFILE_IMAGE: "update profile image",
  UPDATE_PROFILE: "update profile",
  CHANGE_PASSWORD: "change password",
  SOCIAL_LOGIN: "social login",
  BUG_UPLOAD: "bug upload",
  
  // Habit Core Module
  CREATE_HABIT: "create habit",
  CUSTOM_HABIT: "custom habit",
  HABIT_LIST: "habit list",
  UPDATE_HABIT: "update habit",
  DELETE_HABIT: "delete habit",
  ACTIVE_HABIT: "active habit",
  DEACTIVATE_HABIT: "deactivate habit",
  
  // Habit Logs & Tracking
  HABIT_COMPLETED: "habit completed",
  HABIT_SKIPPED: "habit skipped",
  SHOW_COMPLETED: "show completed",
  CONNECTED_HABIT: "connected habit",
  FREQUENCY_PROBLEM: "frequency problem",
  
  // Advanced Modules (Prayer & Features)
  CONNECTED_PRAYER: "connected prayer",
  PROGRESS_TAB: "progress tab",
  SETTINGS: "settings",

  // Fallback
  OTHER: "other"
} as const



 export type TBug = typeof BUG_FEATURES[keyof typeof BUG_FEATURES];
 export type TBugStatus = typeof BUG_STATUS[keyof typeof BUG_STATUS];