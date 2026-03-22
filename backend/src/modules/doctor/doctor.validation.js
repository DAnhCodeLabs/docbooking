import { z } from "zod";

export const registerDoctorSchema = z.object({
  body: z
    .object({
      specialty: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "ID Chuyên khoa không hợp lệ"),
      experience: z.preprocess(
        (val) => Number(val),
        z.number().min(0, "Kinh nghiệm không hợp lệ"),
      ),
      licenseNumber: z
        .string({
          required_error: "Số giấy phép hành nghề là bắt buộc",
        })
        .min(1, "Số giấy phép hành nghề không được để trống")
        .trim(),
      consultationFee: z.preprocess(
        (val) => Number(val),
        z.number().min(0, "Phí khám không hợp lệ"),
      ),
      bio: z.string().optional(),

      // Thêm 2 trường này vào dạng optional (vì chỉ bắt buộc 1 trong 2)
      clinicId: z.string().optional(),
      customClinicName: z.string().optional(),

      qualifications: z.string().optional(), // Parse mảng JSON từ form-data
    })
    // KỸ THUẬT REFINE: Ép buộc phải có ít nhất 1 trong 2 trường
    .refine((data) => data.clinicId || data.customClinicName, {
      message:
        "Bạn bắt buộc phải chọn Phòng khám hệ thống HOẶC tự nhập tên Nơi công tác của mình.",
      path: ["clinicId"], // Báo lỗi đỏ ở trường clinicId trên Frontend
    }),
});

export const getPublicDoctorsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    specialty: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID Chuyên khoa không hợp lệ")
      .optional(),
    sort: z.string().optional().default("-experience"),
    clinicId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ")
      .optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    minExperience: z.string().optional(),
  }),
});

export const doctorIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Bác sĩ không hợp lệ"),
  }),
});

// Schema cho cập nhật thông tin cơ bản (không bao gồm file)
export const updateProfileSchema = z.object({
  body: z
    .object({
      fullName: z
        .string()
        .min(1, "Họ tên không được để trống")
        .trim()
        .optional(),
      phone: z
        .string()
        .regex(
          /^(0|\+84)[3-9][0-9]{8}$/,
          "Số điện thoại không đúng định dạng Việt Nam",
        )
        .optional()
        .nullable(),
      avatar: z.string().optional(), // URL ảnh đại diện (có thể từ upload riêng)
      gender: z.enum(["male", "female", "other"]).optional().nullable(),
      dateOfBirth: z.string().optional().nullable(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      experience: z.number().min(0, "Kinh nghiệm không hợp lệ").optional(),
      bio: z.string().optional(),
      consultationFee: z.number().min(0, "Phí khám không hợp lệ").optional(),
      clinicId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "ID Phòng khám không hợp lệ")
        .optional()
        .nullable(),
      customClinicName: z.string().optional().nullable(),
    })
    // Nếu có clinicId thì customClinicName phải null, và ngược lại
    .refine((data) => !(data.clinicId && data.customClinicName), {
      message:
        "Chỉ được chọn một trong hai: phòng khám hệ thống hoặc tự nhập tên cơ sở",
      path: ["clinicId"],
    }),
  // Nếu không có clinicId thì có thể có customClinicName hoặc không (trường hợp không có nơi công tác)
});

// Schema cho xóa file (dùng chung cho document và activity image)
export const deleteFileSchema = z.object({
  params: z.object({
    publicId: z.string().min(1, "PublicId không hợp lệ"),
  }),
});

export const getPublicDoctorByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID Bác sĩ không hợp lệ"),
  }),
  query: z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sai định dạng YYYY-MM-DD")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sai định dạng YYYY-MM-DD")
      .optional(),
  }),
});
export const getClinicDoctorsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(["pending", "active", "rejected", "inactive"]).optional(),
    specialty: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "ID chuyên khoa không hợp lệ")
      .optional(),
    sort: z.string().optional().default("-createdAt"),
  }),
});

// Schema cho clinic admin xem chi tiết bác sĩ
export const getClinicDoctorDetailSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID bác sĩ không hợp lệ"),
  }),
});

// Schema cho clinic admin xác nhận bác sĩ
export const confirmDoctorSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID bác sĩ không hợp lệ"),
  }),
  // không có body
});

// Schema cho clinic admin từ chối bác sĩ
export const rejectDoctorByClinicSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID bác sĩ không hợp lệ"),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});