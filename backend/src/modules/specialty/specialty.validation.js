import { z } from "zod";

export const createSpecialtySchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Tên chuyên khoa là bắt buộc" })
      .min(2, "Tên chuyên khoa phải có ít nhất 2 ký tự")
      .trim(),
    description: z.string().optional(),
    // Thuộc tính image sẽ được middleware Upload tự động gán vào body, nên ta cho phép optional
    image: z.string().optional(),
  }),
});

export const updateSpecialtySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID chuyên khoa không hợp lệ"),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, "Tên chuyên khoa phải có ít nhất 2 ký tự")
      .trim()
      .optional(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const toggleStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID chuyên khoa không hợp lệ"),
  }),
  body: z.object({
    action: z.enum(["deactivate", "reactivate"], {
      required_error: "Hành động (deactivate/reactivate) là bắt buộc",
    }),
  }),
});
