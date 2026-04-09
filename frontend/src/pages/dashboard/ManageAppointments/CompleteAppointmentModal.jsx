import { getTodayUTC } from "@/utils/date";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const CompleteAppointmentModal = ({
  visible,
  onCancel,
  onConfirm,
  loading,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (values.followUpDate) {
        values.followUpDate = values.followUpDate.toISOString();
      }
      onConfirm(values);
      form.resetFields(); // Reset form sau khi thành công
    } catch (error) {
      // validation error
    }
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Lưu Hồ Sơ & Kết Thúc"
      cancelText="Hủy bỏ"
      width={800}
      centered
      footer={null}
      className="rounded-2xl! overflow-hidden!"
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {/* Header với gradient */}
      <div className="bg-gradient-to-r! from-green-700! to-green-500! px-6! py-5! text-white!">
        <div className="flex! items-center! gap-3!">
          <MedicineBoxOutlined className="text-2xl! text-white!" />
          <div>
            <div className="text-xl! font-bold!">Hoàn tất Khám & Kê đơn</div>
            <div className="text-sm! opacity-90! mt-1!">
              Nhập thông tin kết quả khám, đơn thuốc và hẹn tái khám
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="px-6! py-6! max-h-[70vh] overflow-y-auto custom-scrollbar">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ prescription: [] }}
        >
          {/* KHỐI CHẨN ĐOÁN */}
          <Card
            className="mb-6! border-l-4! border-l-green-500! shadow-sm! rounded-lg!"
            styles={{ body: { padding: "16px" } }}
          >
            <div className="flex! items-center! gap-2! mb-3! text-green-700! font-semibold!">
              <FileTextOutlined className="text-lg!" />
              <span>Chẩn đoán lâm sàng</span>
            </div>
            <Form.Item
              name="diagnosis"
              rules={[
                { required: true, message: "Vui lòng nhập chẩn đoán bệnh" },
              ]}
              className="mb-0!"
            >
              <TextArea
                rows={3}
                placeholder="Ghi nhận tình trạng bệnh, mã ICD (nếu có)..."
                className="rounded-md! border-gray-300! focus:border-green-500! focus:ring-green-500!"
              />
            </Form.Item>
          </Card>

          {/* KHỐI KÊ ĐƠN THUỐC */}
          <Divider
            orientation="left"
            className="text-gray-600! text-sm! font-medium! mb-4! mt-2!"
          >
            <Space>
              <MedicineBoxOutlined />
              ĐƠN THUỐC
            </Space>
          </Divider>

          <Form.List name="prescription">
            {(fields, { add, remove }) => (
              <div className="space-y-4! mb-6!">
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    className="relative border! border-gray-200! shadow-sm! hover:shadow-md! transition-all! duration-200! rounded-lg!"
                    styles={{ body: { padding: "16px" } }}
                  >
                    <div className="absolute top-3! right-3! z-10">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        className="text-gray-400! hover:text-red-500! transition-colors!"
                        title="Xóa thuốc này"
                      />
                    </div>

                    <Text className="text-xs! text-gray-500! font-semibold! mb-3! block">
                      THUỐC #{index + 1}
                    </Text>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4!">
                      <Form.Item
                        {...restField}
                        name={[name, "drugName"]}
                        label={
                          <span className="text-gray-600! text-xs! font-medium!">
                            Tên thuốc <span className="text-red-500!">*</span>
                          </span>
                        }
                        rules={[{ required: true, message: "Bắt buộc nhập" }]}
                        className="mb-0!"
                      >
                        <Input
                          placeholder="VD: Paracetamol 500mg"
                          className="rounded-md! border-gray-300! focus:border-green-500!"
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "dosage"]}
                        label={
                          <span className="text-gray-600! text-xs! font-medium!">
                            Liều dùng <span className="text-red-500!">*</span>
                          </span>
                        }
                        rules={[{ required: true, message: "Bắt buộc nhập" }]}
                        className="mb-0!"
                      >
                        <Input
                          placeholder="VD: Ngày 2 lần, mỗi lần 1 viên"
                          className="rounded-md! border-gray-300! focus:border-green-500!"
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "instructions"]}
                        label={
                          <span className="text-gray-600! text-xs! font-medium!">
                            Cách dùng <span className="text-red-500!">*</span>
                          </span>
                        }
                        rules={[{ required: true, message: "Bắt buộc nhập" }]}
                        className="mb-0!"
                      >
                        <Input
                          placeholder="VD: Uống sau khi ăn no"
                          className="rounded-md! border-gray-300! focus:border-green-500!"
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "duration"]}
                        label={
                          <span className="text-gray-600! text-xs! font-medium!">
                            Thời gian (Tùy chọn)
                          </span>
                        }
                        className="mb-0!"
                      >
                        <Input
                          placeholder="VD: 5 ngày"
                          className="rounded-md! border-gray-300! focus:border-green-500!"
                        />
                      </Form.Item>
                    </div>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  className="w-full! h-12! rounded-lg! border-green-300! text-green-600! bg-green-50! hover:bg-green-100! transition-all!"
                >
                  Thêm thuốc vào đơn
                </Button>
              </div>
            )}
          </Form.List>

          {/* KHỐI LỜI DẶN & TÁI KHÁM */}
          <Divider
            orientation="left"
            className="text-gray-600! text-sm! font-medium! mb-4! mt-2!"
          >
            <Space>
              <CheckCircleOutlined />
              LỜI DẶN & TÁI KHÁM
            </Space>
          </Divider>

          <Card
            className="mb-6! shadow-sm! rounded-lg!"
            styles={{ body: { padding: "16px" } }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4!">
              <Form.Item
                name="instructions"
                label={
                  <span className="text-gray-700! font-medium!">
                    Lời dặn của bác sĩ
                  </span>
                }
                className="md:col-span-2 mb-0!"
              >
                <TextArea
                  rows={2}
                  placeholder="Ghi chú về chế độ ăn uống, sinh hoạt..."
                  className="rounded-md! border-gray-300! focus:border-green-500!"
                />
              </Form.Item>

              <Form.Item
                name="followUpDate"
                label={
                  <span className="text-gray-700! font-medium!">
                    Hẹn tái khám (Nếu có)
                  </span>
                }
                className="mb-0!"
              >
                <DatePicker
                  className="w-full! rounded-md! border-gray-300! focus:border-green-500!"
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                  disabledDate={(current) =>
                    current && dayjs(getTodayUTC()).isAfter(current, "day")
                  }
                  suffixIcon={<CalendarOutlined className="text-gray-400!" />}
                />
              </Form.Item>
            </div>
          </Card>
        </Form>
      </div>

      {/* Footer nút bấm */}
      <div className="border-t! border-gray-100! px-6! py-4! bg-gray-50! flex! justify-end! gap-3! rounded-b-2xl!">
        <Button
          onClick={onCancel}
          className="rounded-md! px-5! h-10! border-gray-300! hover:border-gray-400!"
        >
          Hủy bỏ
        </Button>
        <Button
          type="primary"
          onClick={handleOk}
          loading={loading}
          className="bg-green-600! hover:bg-green-700! border-green-600! rounded-md! px-5! h-10! shadow-sm!"
        >
          Lưu Hồ Sơ & Kết Thúc
        </Button>
      </div>
    </Modal>
  );
};

export default CompleteAppointmentModal;
