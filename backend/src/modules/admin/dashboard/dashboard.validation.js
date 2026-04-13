import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export const dashboardQuerySchema = z.object({
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

export const getReviewStatsSchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "Ngày bắt đầu phải có định dạng YYYY-MM-DD",
        )
        .optional(),
      endDate: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "Ngày kết thúc phải có định dạng YYYY-MM-DD",
        )
        .optional(),
      entityType: z.enum(["all", "doctor", "clinic"]).default("all"),
      limitTop: z.preprocess(
        (val) => parseInt(val, 10) || 5,
        z.number().min(1).max(50),
      ),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          const start = dayjs(data.startDate);
          const end = dayjs(data.endDate);
          if (start.isAfter(end)) return false;
        }
        return true;
      },
      {
        message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          const start = dayjs(data.startDate);
          const end = dayjs(data.endDate);
          if (end.diff(start, "day") > 365) return false;
        }
        return true;
      },
      {
        message:
          "Khoảng thời gian truy vấn tối đa không được vượt quá 365 ngày để đảm bảo hiệu năng",
        path: ["endDate"],
      },
    ),
});