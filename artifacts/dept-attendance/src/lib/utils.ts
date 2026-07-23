import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ROLE_LABELS: Record<string, string> = {
  hod: "Head of Computer Department (HOD)",
  cc_faculty: "Computer Center Faculty",
  school_faculty: "School Computer Faculty",
  lab_instructor: "Mobile Computer Lab Instructor",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
