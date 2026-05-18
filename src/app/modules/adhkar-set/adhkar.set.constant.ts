export const ADHKAR_TYPES = {
  MORNING: "Morning",
  EVENING: "Evening",
  AFTER_SALAH: "After_Salah",
  BEFORE_SLEEP: "Before_Sleep",
} as const;
export type AdhkarType = (typeof ADHKAR_TYPES)[keyof typeof ADHKAR_TYPES];