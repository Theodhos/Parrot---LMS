import { z } from "zod";

export const loginSchema = z.object({
  // Either the account's email or its username (see usernameSchema).
  email: z.string().trim().toLowerCase().min(1, "Enter your email or username").max(254),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Never contains "@", so a login identifier is unambiguously an email or a username. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9._-]+$/, "Username may only contain letters, numbers, dots, hyphens and underscores");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
