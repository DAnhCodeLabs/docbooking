import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { z } from "zod";
import { parseDateToUTC } from "../../utils/date.js";

dayjs.extend(utc);

export const createAppointmentSchema = z.object({
  body: z.object({
    slotId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID slot không hợp lệ"),
    medicalRecordId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID hồ sơ không hợp lệ"),
    note: z.string().optional(),
    symptoms: z.string().optional(),
    paymentMethod: z.enum(["offline", "online"], {
    required_error: "Phương thức thanh toán là bắt buộc",
  }),
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

export const getAppointmentsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z
      .enum(["confirmed", "checked_in", "completed", "cancelled"])
      .optional(),
    search: z.string().optional(),
    dateFrom: z
      .string()
      .optional()
      .transform((str) => (str ? parseDateToUTC(str) : undefined)),
    dateTo: z
      .string()
      .optional()
      .transform((str) =>
        str ? dayjs.utc(str).endOf("day").toDate() : undefined,
      ),
    doctorId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID bác sĩ không hợp lệ")
      .optional(),
  }),
});

export const getAppointmentByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
});

export const getMyAppointmentsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z
      .enum(["confirmed", "checked_in", "completed", "cancelled"])
      .optional(),
    dateFrom: z
      .string()
      .optional()
      .transform((str) => (str ? parseDateToUTC(str) : undefined)),
    dateTo: z
      .string()
      .optional()
      .transform((str) =>
        str ? dayjs.utc(str).endOf("day").toDate() : undefined,
      ),
  }),
});

export const completeAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
  body: z.object({
    diagnosis: z
      .string({ required_error: "Chẩn đoán là bắt buộc" })
      .min(1, "Chẩn đoán không được để trống")
      .trim(),
    prescription: z
      .array(
        z.object({
          drugName: z.string().min(1, "Tên thuốc không được để trống"),
          dosage: z.string().min(1, "Liều lượng không được để trống"),
          instructions: z
            .string()
            .min(1, "Hướng dẫn sử dụng không được để trống"),
          duration: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
    instructions: z.string().optional().default(""),
    followUpDate: z
      .string()
      .optional()
      .transform((val) =>
        val ? dayjs(val).startOf("day").utc().toDate() : null,
      )
      .refine((date) => !date || !isNaN(date.getTime()), {
        message: "Ngày tái khám không hợp lệ",
      }),
  }),
});

