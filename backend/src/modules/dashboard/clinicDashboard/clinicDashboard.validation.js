import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export const clinicDashboardQuerySchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          return dayjs.utc(str).startOf("day").toDate();
        }),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          return dayjs.utc(str).endOf("day").toDate();
        }),
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

export const getClinicReviewStatsSchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          return dayjs.utc(str).startOf("day").toDate();
        }),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải YYYY-MM-DD")
        .optional()
        .transform((str) => {
          if (!str) return undefined;
          return dayjs.utc(str).endOf("day").toDate();
        }),
      groupBy: z.enum(["week", "month", "quarter"]).optional().default("month"),
      sortBy: z
        .enum(["avgRating", "totalReviews"])
        .optional()
        .default("avgRating"),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 5))
        .refine((val) => val > 0 && val <= 20, {
          message: "Limit phải từ 1 đến 20",
        }),
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