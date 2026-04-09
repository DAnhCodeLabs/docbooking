import { Modal, Form, Input, Typography, Alert, Divider } from "antd";
import { WarningOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

const CancelAppointmentModal = ({ visible, onCancel, onConfirm, loading }) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onConfirm(values.reason);
      form.resetFields();
    } catch (error) {
      // validation error
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-red-600">
          <WarningOutlined />
          <span className="font-semibold text-lg">Hủy lịch hẹn</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Xác nhận hủy"
      cancelText="Quay lại"
      okButtonProps={{ danger: true, className: "rounded-md! font-medium!" }}
      cancelButtonProps={{ className: "rounded-md!" }}
      className="rounded-xl! overflow-hidden!"
      centered
    >
      <div className="py-2">
        <Alert
          message="Lưu ý: Hành động này không thể hoàn tác."
          type="warning"
          showIcon
          className="mb-4! rounded-md! border-orange-200! bg-orange-50!"
        />

        {/* Thêm chính sách hoàn tiền */}
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
            <div>
              <Text className="font-semibold text-blue-800 block">
                Chính sách hoàn tiền
              </Text>
              <ul className="text-xs text-blue-700 mt-1 space-y-1 pl-4">
                <li>
                  • Hủy trước 2 giờ so với giờ khám: <strong>hoàn 100%</strong>{" "}
                  số tiền đã thanh toán.
                </li>
                <li>
                  • Hủy trong vòng 2 giờ trước giờ khám:{" "}
                  <strong>hoàn 40%</strong> số tiền.
                </li>
                <li>
                  • Hủy sau giờ khám: <strong>không hoàn tiền</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label={
              <Text className="font-medium! text-gray-700!">
                Lý do hủy lịch (Không bắt buộc)
              </Text>
            }
            rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
            className="mb-0!"
          >
            <Input.TextArea
              rows={4}
              placeholder="Vui lòng cho biết lý do để cải thiện dịch vụ..."
              className="rounded-md! focus:border-red-500! hover:border-red-400!"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default CancelAppointmentModal;
