import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sai định dạng YYYY-MM-DD")
  .transform((str) => new Date(str));

export const createMedicalRecordSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, "Họ tên không được để trống").trim(),
    phone: z
      .string()
      .regex(/^(0|\+84)[3-9][0-9]{8}$/, "Số điện thoại không hợp lệ"),
    dateOfBirth: dateStringSchema,
    gender: z.enum(["male", "female", "other"]),
    cccd: z
      .string()
      .min(9, "CCCD phải có ít nhất 9 ký tự")
      .max(12, "CCCD tối đa 12 ký tự")
      .trim(),
    address: z.string().optional(),
    insurance: z
      .object({
        provider: z.string().optional(),
        policyNumber: z.string().optional(),
        expiryDate: z
          .string()
          .optional()
          .transform((str) => (str ? new Date(str) : undefined)),
      })
      .optional(),
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
      .optional(),
    allergies: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const updateMedicalRecordSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
  body: z.object({
    fullName: z.string().min(1).trim().optional(),
    phone: z
      .string()
      .regex(/^(0|\+84)[3-9][0-9]{8}$/)
      .optional(),
    dateOfBirth: dateStringSchema.optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    cccd: z.string().min(9).max(12).trim().optional(),
    address: z.string().optional(),
    insurance: z
      .object({
        provider: z.string().optional(),
        policyNumber: z.string().optional(),
        expiryDate: z
          .string()
          .optional()
          .transform((str) => (str ? new Date(str) : undefined)),
      })
      .optional(),
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
      .optional(),
    allergies: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const deleteMedicalRecordSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ"),
  }),
});
