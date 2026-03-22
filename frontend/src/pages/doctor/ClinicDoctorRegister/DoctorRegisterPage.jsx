import UploadFile from "@/components/common/UploadFile";
import {
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  message,
  Row,
  Select,
  Tabs,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { specialtyService } from "../../admin/ManageCategories/specialtyService";
import { clinicLeadService } from "./clinicLeadService";
import ClinicRegisterForm from "./components/ClinicRegisterForm"; // import form mới
import DoctorContactPanel from "./components/DoctorContactPanel";
import { doctorService } from "./doctorService";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Schema validation cho bác sĩ (giữ nguyên)
const qualificationSchema = z.object({
  degree: z.string().min(1, "Vui lòng nhập bằng cấp"),
  institution: z.string().min(1, "Vui lòng nhập tên trường"),
  year: z
    .string()
    .refine((val) => /^\d{4}$/.test(val), "Năm phải là 4 số")
    .transform(Number)
    .refine(
      (val) => val >= 1900 && val <= new Date().getFullYear(),
      "Năm không hợp lệ",
    ),
});

const doctorRegisterSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    fullName: z.string().min(1, "Họ tên không được để trống"),
    phone: z
      .string()
      .regex(
        /^(0|\+84)[3-9][0-9]{8}$/,
        "Số điện thoại không đúng định dạng Việt Nam",
      )
      .optional()
      .nullable(),
    clinicId: z.string().optional().nullable(),
    customClinicName: z.string().optional().nullable(),
    specialty: z
      .string({ required_error: "Vui lòng chọn danh mục dịch vụ" })
      .min(1, "Vui lòng chọn danh mục dịch vụ"),
    qualifications: z.array(qualificationSchema).default([]),
    experience: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    licenseNumber: z.string().optional(),
    consultationFee: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    bio: z.string().max(500, "Giới thiệu không quá 500 ký tự").optional(),
  })
  .refine(
    (data) => {
      if (data.clinicId === "other") {
        return !!data.customClinicName;
      }
      return data.clinicId && data.clinicId !== "other";
    },
    {
      message:
        "Vui lòng chọn Phòng khám hệ thống HOẶC nhập tên cơ sở y tế khác",
      path: ["clinicId"],
    },
  );

const DoctorRegisterPage = () => {
  // State cho tab hiện tại
  const [activeTab, setActiveTab] = useState("doctor");
  const [clinics, setClinics] = useState([]);

  // State cho form bác sĩ
  const [fileList, setFileList] = useState([]);
  const [avatarFileList, setAvatarFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialties, setSpecialties] = useState([]);

  // State cho form phòng khám (chưa dùng API)
  const [isSubmittingClinic, setIsSubmittingClinic] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(doctorRegisterSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      clinicId: null,
      customClinicName: "",
      specialty: null,
      qualifications: [],
      experience: "",
      licenseNumber: "",
      consultationFee: "",
      bio: "",
    },
  });

  const selectedClinicId = useWatch({ control, name: "clinicId" });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "qualifications",
  });

  // Lấy danh mục dịch vụ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resSpecialty, resClinic] = await Promise.all([
          specialtyService.getSpecialties({ status: "active", limit: 100 }),
          doctorService.getActiveClinics(), // Gọi API mới tạo
        ]);
        setSpecialties(resSpecialty.specialties || []);
        setClinics(resClinic?.clinics || []);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu danh mục:", error);
      }
    };
    fetchData();
  }, []);

  // Xử lý submit form bác sĩ
  const onSubmitDoctor = async (data) => {
    if (avatarFileList.length === 0) {
      message.error("Vui lòng tải lên ảnh chân dung (Avatar).");
      return;
    }
    if (fileList.length === 0) {
      message.error("Vui lòng tải lên tài liệu chuyên môn (Bằng cấp / GPHN).");
      return;
    }

    if (data.clinicId === "other") {
      delete data.clinicId;
    } else {
      delete data.customClinicName;
    }

    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        if (key === "qualifications") {
          try {
            formData.append(key, JSON.stringify(data[key]));
          } catch (err) {
            console.error("Error serializing qualifications:", err);
            message.error("Có lỗi khi xử lý thông tin bằng cấp");
          }
        } else {
          formData.append(key, data[key]);
        }
      }
    });

    formData.append("avatarUrl", avatarFileList[0].originFileObj);
    fileList.forEach((file) => {
      formData.append("uploadedDocuments", file.originFileObj);
    });

    setIsSubmitting(true);
    try {
      await doctorService.registerDoctor(formData);
      reset();
      setAvatarFileList([]);
      setFileList([]);
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý submit form phòng khám (chưa gọi API)
  const onSubmitClinic = async (formData) => {
    setIsSubmittingClinic(true);
    try {
      // Gọi lên Backend. Vì formData đã được xử lý gọn gàng ở Component con nên ta chỉ việc truyền vào
      await clinicLeadService.registerClinic(formData);
      return true; // Trả về true để Component con (ClinicRegisterForm) reset form trắng lại
    } catch (error) {
      console.error("Lỗi gửi yêu cầu hợp tác phòng khám:", error);
      return false; // Trả về false nếu lỗi
    } finally {
      setIsSubmittingClinic(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Panel bên trái cố định */}
        <div className="w-full lg:w-[35%] shrink-0">
          <DoctorContactPanel />
        </div>

        {/* Panel bên phải với Tabs */}
        <div className="w-full lg:w-[65%] p-6 md:p-10 lg:p-12 h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            size="large"
            items={[
              {
                key: "doctor",
                label: "Đăng ký Bác sĩ",
                children: (
                  <>
                    <div className="mb-8 text-center sm:text-left">
                      <Title level={2} className="mb-2! text-slate-800!">
                        Đăng ký thông tin Bác sĩ
                      </Title>
                      <Text type="secondary" className="text-base">
                        Vui lòng điền thông tin để được xét duyệt. Mật khẩu sẽ
                        được cấp sau khi duyệt.
                      </Text>
                    </div>

                    <Form
                      layout="vertical"
                      onFinish={handleSubmit(onSubmitDoctor)}
                    >
                      {/* Toàn bộ form bác sĩ hiện tại, giữ nguyên */}
                      {/* ... copy từ file cũ, nhưng đã có sẵn trong component này, chỉ cần giữ lại */}
                      <Row gutter={24}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            label="Họ và tên"
                            required
                            validateStatus={errors.fullName ? "error" : ""}
                            help={errors.fullName?.message}
                          >
                            <Controller
                              name="fullName"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  prefix={
                                    <UserOutlined className="text-gray-400" />
                                  }
                                  placeholder="VD: Nguyễn Văn A"
                                  className="rounded-lg"
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            label="Số điện thoại"
                            validateStatus={errors.phone ? "error" : ""}
                            help={errors.phone?.message}
                          >
                            <Controller
                              name="phone"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  prefix={
                                    <PhoneOutlined className="text-gray-400" />
                                  }
                                  placeholder="VD: 0912345678"
                                  className="rounded-lg"
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

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
                              prefix={
                                <MailOutlined className="text-gray-400" />
                              }
                              placeholder="example@email.com"
                              className="rounded-lg"
                            />
                          )}
                        />
                      </Form.Item>

                      <Divider className="my-6 border-slate-200" />

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                        <Form.Item
                          label="Ảnh chân dung (Avatar)"
                          className="mb-0"
                        >
                          <UploadFile
                            fileList={avatarFileList}
                            onChange={setAvatarFileList}
                            maxCount={1}
                            listType="picture-circle"
                            accept="image/*"
                          />
                        </Form.Item>
                        <Text
                          type="secondary"
                          className="text-sm w-full sm:w-1/2"
                        >
                          Sử dụng ảnh chân dung rõ mặt, trang phục lịch sự. Tối
                          đa 5MB.
                        </Text>
                      </div>

                      <Row gutter={24}>
                        <Col xs={24}>
                          <Form.Item
                            label="Danh mục dịch vụ (Chuyên khoa)"
                            required
                            validateStatus={errors.specialty ? "error" : ""}
                            help={errors.specialty?.message}
                          >
                            <Controller
                              name="specialty"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  {...field}
                                  placeholder="Chọn danh mục dịch vụ..."
                                  allowClear
                                  className="rounded-lg"
                                  showSearch
                                  optionFilterProp="label"
                                  options={specialties.map((s) => ({
                                    label: s.name,
                                    value: s._id,
                                  }))}
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item
                            label="Cơ sở y tế đang công tác"
                            required
                            validateStatus={errors.clinicId ? "error" : ""}
                            help={errors.clinicId?.message}
                          >
                            <Controller
                              name="clinicId"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  {...field}
                                  placeholder="Chọn cơ sở y tế..."
                                  allowClear
                                  className="rounded-lg"
                                  showSearch
                                  optionFilterProp="label"
                                  options={[
                                    ...clinics.map((c) => ({
                                      label: c.clinicName,
                                      value: c._id,
                                    })),
                                    {
                                      label: "Khác (Nhập tay)",
                                      value: "other",
                                    }, // Option cho phép nhập tay
                                  ]}
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      {selectedClinicId === "other" && (
                        <Row gutter={24}>
                          <Col xs={24}>
                            <Form.Item
                              label="Tên cơ sở y tế cụ thể"
                              required
                              validateStatus={
                                errors.customClinicName ? "error" : ""
                              }
                              help={errors.customClinicName?.message}
                            >
                              <Controller
                                name="customClinicName"
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    placeholder="VD: Bệnh viện Quân Y 103"
                                    className="rounded-lg"
                                  />
                                )}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      <Row gutter={24}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            label="Số năm kinh nghiệm"
                            validateStatus={errors.experience ? "error" : ""}
                            help={errors.experience?.message}
                          >
                            <Controller
                              name="experience"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  placeholder="VD: 5"
                                  addonAfter="Năm"
                                  className="rounded-lg"
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            label="Phí khám tư vấn (VND)"
                            validateStatus={
                              errors.consultationFee ? "error" : ""
                            }
                            help={errors.consultationFee?.message}
                          >
                            <Controller
                              name="consultationFee"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  placeholder="VD: 200000"
                                  addonAfter="VNĐ"
                                  className="rounded-lg"
                                />
                              )}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        label="Số giấy phép hành nghề (GPHN)"
                        validateStatus={errors.licenseNumber ? "error" : ""}
                        help={errors.licenseNumber?.message}
                      >
                        <Controller
                          name="licenseNumber"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="VD: 12345/BYT-CCHN"
                              className="rounded-lg"
                            />
                          )}
                        />
                      </Form.Item>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                        <div className="flex justify-between items-center mb-4">
                          <Text className="font-semibold text-slate-700">
                            Trình độ & Bằng cấp
                          </Text>
                          <Button
                            type="dashed"
                            onClick={() =>
                              append({ degree: "", institution: "", year: "" })
                            }
                            icon={<PlusOutlined />}
                            size="small"
                          >
                            Thêm bằng cấp
                          </Button>
                        </div>

                        {fields.map((item, index) => (
                          <Row
                            key={item.id}
                            gutter={12}
                            align="top"
                            className="mb-2 bg-white p-3 rounded-lg border border-slate-200"
                          >
                            <Col xs={24} sm={8}>
                              <Form.Item
                                className="mb-2 sm:mb-0"
                                validateStatus={
                                  errors.qualifications?.[index]?.degree
                                    ? "error"
                                    : ""
                                }
                                help={
                                  errors.qualifications?.[index]?.degree
                                    ?.message
                                }
                              >
                                <Controller
                                  name={`qualifications.${index}.degree`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      placeholder="Tên bằng cấp"
                                    />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                              <Form.Item
                                className="mb-2 sm:mb-0"
                                validateStatus={
                                  errors.qualifications?.[index]?.institution
                                    ? "error"
                                    : ""
                                }
                                help={
                                  errors.qualifications?.[index]?.institution
                                    ?.message
                                }
                              >
                                <Controller
                                  name={`qualifications.${index}.institution`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      placeholder="Nơi đào tạo"
                                    />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={20} sm={6}>
                              <Form.Item
                                className="mb-0"
                                validateStatus={
                                  errors.qualifications?.[index]?.year
                                    ? "error"
                                    : ""
                                }
                                help={
                                  errors.qualifications?.[index]?.year?.message
                                }
                              >
                                <Controller
                                  name={`qualifications.${index}.year`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input {...field} placeholder="Năm TN" />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={4} sm={2} className="flex justify-end">
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(index)}
                              />
                            </Col>
                          </Row>
                        ))}
                        {fields.length === 0 && (
                          <Text type="secondary" className="text-sm italic">
                            Chưa có thông tin bằng cấp.
                          </Text>
                        )}
                      </div>

                      <Form.Item label="Tài liệu chuyên môn (Bằng cấp, GPHN - file ảnh hoặc PDF)">
                        <UploadFile
                          fileList={fileList}
                          onChange={setFileList}
                          maxCount={10}
                          multiple
                          accept=".jpg,.jpeg,.png,.pdf"
                          listType="text"
                        >
                          <Button
                            icon={<PlusOutlined />}
                            className="bg-slate-50"
                          >
                            Tải lên tài liệu
                          </Button>
                        </UploadFile>
                      </Form.Item>

                      <Form.Item
                        label="Giới thiệu bản thân / Tiểu sử"
                        validateStatus={errors.bio ? "error" : ""}
                        help={errors.bio?.message}
                      >
                        <Controller
                          name="bio"
                          control={control}
                          render={({ field }) => (
                            <TextArea
                              {...field}
                              rows={4}
                              placeholder="Tóm tắt quá trình công tác, thế mạnh chuyên môn..."
                              maxLength={500}
                              showCount
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
                          {isSubmitting
                            ? "ĐANG GỬI HỒ SƠ..."
                            : "GỬI HỒ SƠ ĐĂNG KÝ"}
                        </Button>
                      </div>
                    </Form>
                  </>
                ),
              },
              {
                key: "clinic",
                label: "Đăng ký Phòng khám",
                children: (
                  <>
                    <div className="mb-8 text-center sm:text-left">
                      <Title level={2} className="mb-2! text-slate-800!">
                        Đăng ký hợp tác Phòng khám
                      </Title>
                      <Text type="secondary" className="text-base">
                        Điền thông tin để đội ngũ DocGo liên hệ và tư vấn hợp
                        tác.
                      </Text>
                    </div>

                    <ClinicRegisterForm
                      isSubmitting={isSubmittingClinic}
                      onSubmit={onSubmitClinic}
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default DoctorRegisterPage;
