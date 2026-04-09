import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { z } from "zod";

dayjs.extend(utc);

// Schema cho query params (danh sách)
export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    search: z.string().optional(),
    role: z.enum(["patient", "doctor", "admin"]).optional(),
    status: z.enum(["active", "inactive", "banned"]).optional(),
    sort: z.string().optional().default("-createdAt"),
  }),
});

// Schema cho params (userId)
export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
});

// Schema cho khóa tài khoản
export const banUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
  body: z.object({
    // Master Dev: Ép buộc nhập lý do (ít nhất 5 ký tự để tránh nhập bừa)
    reason: z
      .string({ required_error: "Lý do khóa tài khoản là bắt buộc" })
      .min(5, "Lý do phải có ít nhất 5 ký tự")
      .trim(),
    // Master Dev: Ép buộc nhập thời gian, phải là chuẩn ISO Date và phải ở Tương lai
    bannedUntil: z
      .string({ required_error: "Thời gian mở khóa là bắt buộc" })
      .datetime({
        message: "Định dạng thời gian không hợp lệ (chuẩn ISO 8601)",
      })
      .refine((date) => dayjs(date).utc().isAfter(dayjs().utc()), {
        message: "Thời gian mở khóa phải nằm trong tương lai",
      }),
  }),
});

// Schema cho mở khóa (không cần body)
export const unbanUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
});

export const getDoctorApplicationsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(Number),
    limit: z.string().optional().transform(Number),
    search: z.string().optional(), // Sẽ filter theo email/tên của user
    status: z
      .union([
        z.enum([
          "pending",
          "active",
          "rejected",
          "inactive",
          "pending_admin_approval",
        ]),
        z
          .string()
          .regex(/^([a-z_]+)(,[a-z_]+)*$/)
          .transform((str) => str.split(",")),
      ])
      .optional()
      .default("pending"),
  }),
});

export const processDoctorApplicationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID hồ sơ không hợp lệ"),
  }),
  body: z
    .object({
      action: z.enum(["approve", "reject"], {
        required_error: "Hành động (Duyệt/Từ chối) là bắt buộc",
      }),
      reason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Nếu Từ chối -> Bắt buộc phải có lý do
      if (
        data.action === "reject" &&
        (!data.reason || data.reason.trim().length < 10)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Phải nhập lý do từ chối (ít nhất 10 ký tự) khi từ chối hồ sơ.",
          path: ["reason"],
        });
      }
    }),
});
