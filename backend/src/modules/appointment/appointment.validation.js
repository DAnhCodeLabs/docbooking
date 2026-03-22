import { z } from "zod";

export const createAppointmentSchema = z.object({
  body: z.object({
    slotId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID slot không hợp lệ"),
    medicalRecordId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID hồ sơ không hợp lệ"),
    note: z.string().optional(),
    symptoms: z.string().optional(),
  }),
});

export const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});

export const checkinAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
});
