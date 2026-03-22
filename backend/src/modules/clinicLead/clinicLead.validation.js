import { z } from "zod";

export const registerClinicSchema = z.object({
  body: z.object({
    clinicName: z
      .string({ required_error: "Vui lòng nhập tên cơ sở y tế" })
      .min(2, "Tên quá ngắn")
      .trim(),
    clinicType: z.enum(
      ["hospital", "polyclinic", "specialist_clinic", "other"],
      {
        required_error: "Vui lòng chọn loại hình cơ sở",
      },
    ),
    address: z
      .string({ required_error: "Vui lòng nhập địa chỉ" })
      .min(5, "Địa chỉ quá ngắn")
      .trim(),
    representativeName: z
      .string({ required_error: "Vui lòng nhập tên người đại diện" })
      .min(2, "Tên quá ngắn")
      .trim(),
    phone: z
      .string({ required_error: "Vui lòng nhập số điện thoại" })
      .regex(
        /^(0|\+84)[3-9][0-9]{8}$/,
        "Số điện thoại không đúng định dạng Việt Nam",
      ),
    email: z
      .string({ required_error: "Vui lòng nhập email" })
      .email("Email không hợp lệ")
      .trim(),
    notes: z.string().optional(),
    image: z.string().optional(), // Middleware upload sẽ đẩy URL ảnh vào trường này
  }),
});

export const updateClinicLeadStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ"),
  }),
  body: z
    .object({
      status: z.enum(["resolved", "rejected"], {
        required_error: "Vui lòng truyền trạng thái (resolved hoặc rejected)",
      }),
      reason: z.string().optional(), // Lý do từ chối (nếu có)
    })
    .refine(
      (data) => {
        // Nếu từ chối thì bắt buộc phải có lý do
        if (
          data.status === "rejected" &&
          (!data.reason || data.reason.trim() === "")
        ) {
          return false;
        }
        return true;
      },
      { message: "Vui lòng nhập lý do từ chối hồ sơ", path: ["reason"] },
    ),
});

export const lockClinicSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ"),
  }),
  body: z.object({
    reason: z
      .string({ required_error: "Vui lòng nhập lý do khóa" })
      .min(5, "Lý do phải có ít nhất 5 ký tự")
      .trim(),
  }),
});

// Schema cho mở khóa
export const unlockClinicSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ"),
  }),
  // Không cần body
});

// Schema cho xóa mềm
export const softDeleteClinicSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ"),
  }),
  body: z.object({
    reason: z.string().optional().nullable(), // Lý do xóa (không bắt buộc)
  }),
});