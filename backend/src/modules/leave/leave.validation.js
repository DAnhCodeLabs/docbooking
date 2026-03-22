import { z } from "zod";

export const createLeaveSchema = z.object({
  body: z
    .object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),
      startTime: z
        .string()
        .regex(
          /^([01]\d|2[0-3]):([0-5]\d)$/,
          "Giờ bắt đầu sai định dạng (HH:mm)",
        )
        .default("00:00"),
      endTime: z
        .string()
        .regex(
          /^([01]\d|2[0-3]):([0-5]\d)$/,
          "Giờ kết thúc sai định dạng (HH:mm)",
        )
        .default("23:59"),
      reason: z.string().optional(),
    })
    .refine((data) => data.startTime < data.endTime, {
      message: "Giờ kết thúc phải sau giờ bắt đầu",
      path: ["endTime"],
    }),
});

export const cancelLeaveSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Ngày nghỉ không hợp lệ"),
  }),
});
