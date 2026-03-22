import { z } from "zod";

export const createScheduleSchema = z.object({
  body: z
    .object({
      // Loại bỏ doctorId khỏi body vì chỉ bác sĩ tự tạo
      // Thay vào đó, hỗ trợ chọn nhiều ngày
      dateRange: z
        .object({
          start: z
            .string()
            .regex(
              /^\d{4}-\d{2}-\d{2}$/,
              "Ngày bắt đầu phải theo định dạng YYYY-MM-DD",
            ),
          end: z
            .string()
            .regex(
              /^\d{4}-\d{2}-\d{2}$/,
              "Ngày kết thúc phải theo định dạng YYYY-MM-DD",
            ),
        })
        .optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD")
        .optional(),
      shifts: z
        .array(
          z.object({
            startTime: z
              .string()
              .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ bắt đầu sai (HH:mm)"),
            endTime: z
              .string()
              .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ kết thúc sai (HH:mm)"),
          }),
        )
        .min(1, "Phải có ít nhất 1 ca làm việc"),
      slotDuration: z
        .number()
        .min(5, "Tối thiểu 5 phút")
        .max(120, "Tối đa 120 phút"),
    })
    .refine(
      (data) => {
        // Phải có một trong hai: date hoặc dateRange
        return (data.date && !data.dateRange) || (!data.date && data.dateRange);
      },
      {
        message: "Vui lòng chọn một ngày cụ thể hoặc một khoảng ngày",
        path: ["date"],
      },
    )
    .refine(
      (data) => {
        if (data.dateRange) {
          return new Date(data.dateRange.start) <= new Date(data.dateRange.end);
        }
        return true;
      },
      {
        message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc",
        path: ["dateRange"],
      },
    ),
});

export const toggleSlotSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Slot không hợp lệ"),
  }),
  body: z.object({
    action: z.enum(["block", "unblock"], {
      required_error: "Hành động phải là block hoặc unblock",
    }),
  }),
});

// Bổ sung vào cuối file src/modules/schedule/schedule.validation.js

export const getSchedulesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    doctorId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID Bác sĩ không hợp lệ")
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sai định dạng YYYY-MM-DD")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sai định dạng YYYY-MM-DD")
      .optional(),
    sort: z.string().optional().default("-date"), // Mặc định sắp xếp ngày mới nhất lên đầu
  }),
});

export const getScheduleSlotsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Lịch làm việc không hợp lệ"),
  }),
});
