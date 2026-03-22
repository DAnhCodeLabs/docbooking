import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { doctorApi } from "./doctorApi";
import { httpGet } from "@/services/http";

const { Option } = Select;
const { TextArea } = Input;

// Component hiển thị text tĩnh (Chế độ xem)
const InfoField = ({ label, value }) => (
  <div className="border-b border-gray-100 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
    <div className="sm:w-1/3 text-sm font-medium text-gray-600">{label}</div>
    <div className="sm:w-2/3 text-sm text-gray-900">
      {value || <span className="text-gray-400 italic">Chưa cập nhật</span>}
    </div>
  </div>
);

const InfoTab = ({ profile, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [workplaceType, setWorkplaceType] = useState("system"); // 'system' | 'custom'
  const [form] = Form.useForm();

  // Gọi API lấy danh sách phòng khám hệ thống
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await httpGet("/clinic-leads/active");

        // MASTER DEV FIX: Bóc tách đúng cấu trúc { clinics: [...] } từ Backend
        if (Array.isArray(data)) {
          setClinics(data);
        } else if (data && Array.isArray(data.clinics)) {
          // Bắt đúng mảng clinics trong object trả về
          setClinics(data.clinics);
        } else if (data && Array.isArray(data.data)) {
          setClinics(data.data);
        } else {
          setClinics([]);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách phòng khám:", error);
      }
    };
    fetchClinics();
  }, []);

  const handleEdit = () => {
    // Xác định loại nơi công tác đang dùng để hiển thị đúng tab
    const currentWorkplaceType = profile?.clinicId ? "system" : "custom";
    setWorkplaceType(currentWorkplaceType);

    form.setFieldsValue({
      fullName: profile?.user?.fullName,
      phone: profile?.user?.phone,
      gender: profile?.user?.gender,
      dateOfBirth: profile?.user?.dateOfBirth
        ? dayjs(profile.user.dateOfBirth)
        : null,
      address: {
        // ← Đặt làm object
        street: profile?.user?.address?.street,
        city: profile?.user?.address?.city,
        state: profile?.user?.address?.state,
      },
      experience: profile?.experience,
      consultationFee: profile?.consultationFee,
      bio: profile?.bio,
      workplaceType: currentWorkplaceType,
      clinicId: profile?.clinicId?._id || undefined,
      customClinicName: profile?.customClinicName,
    });
    setEditing(true);
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // 1. Chuẩn bị payload chuẩn khớp 100% với Zod Schema ở Backend
      const payload = {
        fullName: values.fullName,
        phone: values.phone,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
        address: values.address,
        experience: values.experience,
        consultationFee: values.consultationFee,
        bio: values.bio,
      };

      // 2. Xử lý logic cứng Nơi công tác (XOR - Chỉ 1 trong 2)
      if (workplaceType === "system") {
        payload.clinicId = values.clinicId || null;
        payload.customClinicName = null;
      } else {
        payload.clinicId = null;
        payload.customClinicName = values.customClinicName || null;
      }

      // 3. Gọi API cập nhật
      await doctorApi.updateProfile(payload);
      setEditing(false);

      // 4. Đồng bộ lại dữ liệu mới nhất từ DB
      if (onRefresh) onRefresh();
    } catch (error) {
      // Lỗi đã được axiosClient interceptor hiển thị qua toast
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Trích xuất địa chỉ hiển thị
  const addressString = [
    profile?.user?.address?.street,
    profile?.user?.address?.city,
    profile?.user?.address?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="animate-fade-in bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 m-0">
          Thông tin cơ bản
        </h3>
        {!editing ? (
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            Chỉnh sửa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(false)} disabled={loading}>
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
              className="bg-blue-600"
            >
              Lưu thay đổi
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Form form={form} layout="vertical" onFinish={handleSave} className="">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <Form.Item
              label="Họ và tên"
              name="fullName"
              rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
            >
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>

            <Form.Item label="Số điện thoại" name="phone">
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>

            <Form.Item label="Giới tính" name="gender">
              <Select placeholder="Chọn giới tính">
                <Option value="male">Nam</Option>
                <Option value="female">Nữ</Option>
                <Option value="other">Khác</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Ngày sinh" name="dateOfBirth">
              <DatePicker
                format="DD/MM/YYYY"
                className="w-full"
                placeholder="Chọn ngày sinh"
              />
            </Form.Item>

            <Form.Item label="Số nhà, Tên đường" name={["address", "street"]}>
              <Input placeholder="Ví dụ: 123 Đường ABC" />
            </Form.Item>

            <Form.Item label="Thành phố / Tỉnh" name={["address", "city"]}>
              <Input placeholder="Ví dụ: Hà Nội" />
            </Form.Item>

            <Form.Item label="Quận / Huyện" name={["address", "state"]}>
              <Input placeholder="Ví dụ: Cầu Giấy" />
            </Form.Item>

            <Form.Item label="Kinh nghiệm (Năm)" name="experience">
              <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>

            <Form.Item label="Phí tư vấn (VNĐ)" name="consultationFee">
              <InputNumber
                className="w-full"
                min={0}
                step={50000}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              />
            </Form.Item>

            {/* QUẢN LÝ NƠI CÔNG TÁC (CHỈ 1 TRONG 2) */}
            <div className="md:col-span-2 border border-gray-200 p-4 rounded-lg bg-gray-50 mt-2 mb-4">
              <Form.Item
                label={<span className="font-semibold">Nơi công tác</span>}
                name="workplaceType"
                className="mb-3"
              >
                <Radio.Group onChange={(e) => setWorkplaceType(e.target.value)}>
                  <Radio value="system">Phòng khám thuộc hệ thống</Radio>
                  <Radio value="custom">Nơi công tác tự do</Radio>
                </Radio.Group>
              </Form.Item>

              {workplaceType === "system" ? (
                <Form.Item
                  name="clinicId"
                  rules={[
                    { required: true, message: "Vui lòng chọn phòng khám" },
                  ]}
                  className="mb-0"
                >
                  <Select
                    placeholder="-- Chọn phòng khám hệ thống --"
                    showSearch
                    optionFilterProp="children"
                  >
                    {clinics.map((clinic) => (
                      <Option key={clinic._id} value={clinic._id}>
                        {clinic.clinicName} - {clinic.address}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item
                  name="customClinicName"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập tên nơi công tác",
                    },
                  ]}
                  className="mb-0"
                >
                  <Input placeholder="Ví dụ: Bệnh viện Bạch Mai" />
                </Form.Item>
              )}
            </div>

            <Form.Item
              label="Tiểu sử / Giới thiệu"
              name="bio"
              className="md:col-span-2"
            >
              <TextArea
                rows={4}
                placeholder="Viết vài dòng giới thiệu về bản thân..."
              />
            </Form.Item>
          </div>
        </Form>
      ) : (
        <div className="flex flex-col">
          <InfoField label="Email đăng nhập" value={profile?.user?.email} />
          <InfoField label="Họ và tên" value={profile?.user?.fullName} />
          <InfoField label="Số điện thoại" value={profile?.user?.phone} />
          <InfoField
            label="Giới tính"
            value={
              profile?.user?.gender === "male"
                ? "Nam"
                : profile?.user?.gender === "female"
                  ? "Nữ"
                  : profile?.user?.gender === "other"
                    ? "Khác"
                    : null
            }
          />
          <InfoField
            label="Ngày sinh"
            value={
              profile?.user?.dateOfBirth
                ? dayjs(profile.user.dateOfBirth).format("DD/MM/YYYY")
                : null
            }
          />
          <InfoField label="Địa chỉ" value={addressString} />
          <InfoField label="Chuyên khoa" value={profile?.specialty?.name} />
          <InfoField
            label="Kinh nghiệm"
            value={profile?.experience ? `${profile.experience} năm` : null}
          />
          <InfoField
            label="Phí tư vấn"
            value={
              profile?.consultationFee
                ? `${profile.consultationFee.toLocaleString()} VNĐ`
                : null
            }
          />
          <InfoField
            label="Số giấy phép hành nghề"
            value={profile?.licenseNumber}
          />
          <InfoField
            label="Cơ sở công tác"
            value={
              profile?.clinicId
                ? `${profile.clinicId.clinicName} (Hệ thống)`
                : profile?.customClinicName
            }
          />
          <InfoField label="Tiểu sử" value={profile?.bio} />
        </div>
      )}
    </div>
  );
};

export default InfoTab;
