import { z } from "zod";

// Schema cho tạo review
export const createReviewSchema = z.object({
  body: z.object({
    appointmentId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID lịch hẹn không hợp lệ"),
    rating: z
      .number()
      .int()
      .min(1, "Số sao tối thiểu là 1")
      .max(5, "Số sao tối đa là 5"),
    comment: z
      .string()
      .max(500, "Nhận xét không được vượt quá 500 ký tự")
      .optional()
      .default(""),
  }),
});

// Schema cho lấy danh sách review của user (phân trang)
export const getMyReviewsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: "Page phải lớn hơn 0" }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0, { message: "Limit phải lớn hơn 0" }),
  }),
});

// Schema cho lấy review công khai của bác sĩ
export const getDoctorReviewsSchema = z.object({
  params: z.object({
    doctorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID bác sĩ không hợp lệ"),
  }),
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: "Page phải lớn hơn 0" }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0, { message: "Limit phải lớn hơn 0" }),
  }),
});

export const getReviewStatsSchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          const date = new Date(str);
          if (isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");
          return date;
        }),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          const date = new Date(str);
          if (isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");
          // endDate nên là cuối ngày
          return new Date(date.setUTCHours(23, 59, 59, 999));
        }),
      groupBy: z.enum(["week", "month", "quarter"]).optional().default("month"),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      {
        message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc",
        path: ["startDate"],
      },
    ),
});
