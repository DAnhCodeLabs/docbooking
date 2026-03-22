import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, Input, Button, Typography, Select } from "antd";
import { SendOutlined } from "@ant-design/icons";
import UploadFile from "@/components/common/UploadFile";

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// Schema validation với trường otherClinicType (Giữ nguyên)
const clinicSchema = z
  .object({
    clinicName: z.string().min(1, "Tên phòng khám không được để trống"),
    clinicType: z.enum(
      ["hospital", "polyclinic", "specialist_clinic", "other"],
      {
        required_error: "Vui lòng chọn loại hình cơ sở y tế",
      },
    ),
    otherClinicType: z.string().optional(),
    address: z.string().min(1, "Địa chỉ không được để trống"),
    representativeName: z
      .string()
      .min(1, "Tên người đại diện không được để trống"),
    phone: z
      .string()
      .regex(
        /^(0|\+84)[3-9][0-9]{8}$/,
        "Số điện thoại không đúng định dạng Việt Nam",
      ),
    email: z.string().email("Email không hợp lệ"),
    image: z.any().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.clinicType === "other" && !data.otherClinicType) {
        return false;
      }
      return true;
    },
    {
      message: "Vui lòng nhập loại hình cụ thể",
      path: ["otherClinicType"],
    },
  );

const ClinicRegisterForm = ({ isSubmitting, onSubmit }) => {
  const [imageFileList, setImageFileList] = useState([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset, // Lấy thêm hàm reset từ react-hook-form để xóa form khi gửi xong
  } = useForm({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      clinicName: "",
      clinicType: undefined,
      otherClinicType: "",
      address: "",
      representativeName: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  // Theo dõi giá trị clinicType
  const clinicType = useWatch({ control, name: "clinicType" });

  // MASTER DEV FIX: Xử lý dữ liệu thành FormData và đồng bộ Field với Backend
  const handleFormSubmit = async (data) => {
    const formData = new FormData();

    // 1. Append các field cơ bản
    formData.append("clinicName", data.clinicName);
    formData.append("clinicType", data.clinicType);
    formData.append("address", data.address);
    formData.append("representativeName", data.representativeName);
    formData.append("phone", data.phone);
    formData.append("email", data.email);

    // 2. Xử lý đồng bộ trường otherClinicType -> Nối vào Notes
    let finalNotes = data.notes || "";
    if (data.clinicType === "other" && data.otherClinicType) {
      finalNotes = `Loại hình khác: ${data.otherClinicType} \n${finalNotes}`;
    }
    if (finalNotes.trim() !== "") {
      formData.append("notes", finalNotes);
    }

    // 3. Xử lý file ảnh
    if (imageFileList.length > 0 && imageFileList[0].originFileObj) {
      formData.append("image", imageFileList[0].originFileObj);
    }

    // Gửi formData ra ngoài và đợi kết quả. Nếu thành công thì reset form.
    const isSuccess = await onSubmit(formData);
    if (isSuccess) {
      reset();
      setImageFileList([]); // Xóa ảnh đã chọn
    }
  };

  // ==================== PHẦN UI GIỮ NGUYÊN 100% ====================
  return (
    <Form layout="vertical" onFinish={handleSubmit(handleFormSubmit)}>
      <Form.Item
        label="Tên phòng khám / Cơ sở y tế"
        required
        validateStatus={errors.clinicName ? "error" : ""}
        help={errors.clinicName?.message}
      >
        <Controller
          name="clinicName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="VD: Phòng khám Đa khoa An Việt"
              className="rounded-lg"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Loại hình cơ sở"
        required
        validateStatus={errors.clinicType ? "error" : ""}
        help={errors.clinicType?.message}
      >
        <Controller
          name="clinicType"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              placeholder="Chọn loại hình"
              className="rounded-lg"
            >
              <Option value="hospital">Bệnh viện</Option>
              <Option value="polyclinic">Phòng khám đa khoa</Option>
              <Option value="specialist_clinic">Phòng khám chuyên khoa</Option>
              <Option value="other">Khác</Option>
            </Select>
          )}
        />
      </Form.Item>

      {clinicType === "other" && (
        <Form.Item
          label="Nhập loại hình cụ thể"
          required
          validateStatus={errors.otherClinicType ? "error" : ""}
          help={errors.otherClinicType?.message}
        >
          <Controller
            name="otherClinicType"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="VD: Trung tâm y tế dự phòng"
                className="rounded-lg"
              />
            )}
          />
        </Form.Item>
      )}

      <Form.Item
        label="Địa chỉ"
        required
        validateStatus={errors.address ? "error" : ""}
        help={errors.address?.message}
      >
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              className="rounded-lg"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Người đại diện"
        required
        validateStatus={errors.representativeName ? "error" : ""}
        help={errors.representativeName?.message}
      >
        <Controller
          name="representativeName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Họ và tên người đại diện"
              className="rounded-lg"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Số điện thoại liên hệ"
        required
        validateStatus={errors.phone ? "error" : ""}
        help={errors.phone?.message}
      >
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="0912345678" className="rounded-lg" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Email"
        required
        validateStatus={errors.email ? "error" : ""}
        help={errors.email?.message}
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="example@clinic.vn"
              className="rounded-lg"
            />
          )}
        />
      </Form.Item>

      <Form.Item label="Ảnh đại diện / Logo (tùy chọn)">
        <UploadFile
          fileList={imageFileList}
          onChange={setImageFileList}
          maxCount={1}
          listType="picture-card"
          accept="image/*"
        />
        <Text type="secondary" className="text-xs block mt-1">
          Chọn ảnh đại diện cho cơ sở (logo hoặc hình ảnh minh họa)
        </Text>
      </Form.Item>

      <Form.Item
        label="Ghi chú thêm (nếu có)"
        validateStatus={errors.notes ? "error" : ""}
        help={errors.notes?.message}
      >
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={4}
              placeholder="Thông tin thêm về nhu cầu hợp tác, quy mô phòng khám, v.v."
              className="rounded-lg"
            />
          )}
        />
      </Form.Item>

      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={isSubmitting}
          icon={<SendOutlined />}
        >
          {isSubmitting ? "ĐANG GỬI..." : "GỬI YÊU CẦU HỢP TÁC"}
        </Button>
      </div>
    </Form>
  );
};

export default ClinicRegisterForm;
