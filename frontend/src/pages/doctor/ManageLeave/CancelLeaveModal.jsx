import { Modal } from "@/components/common";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

const CancelLeaveModal = ({ visible, leave, onConfirm, onCancel }) => {
  return (
    <Modal
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          Xác nhận hủy đăng ký nghỉ
        </span>
      }
      okText="Xác nhận hủy"
      cancelText="Đóng"
      okButtonProps={{
        danger: true,
        className: " font-medium! shadow-sm!",
      }}
      cancelButtonProps={{ className: " font-medium!" }}
    >
      <div className="py-2">
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
          <ExclamationCircleOutlined className="text-xl! mt-0.5! text-red-600!" />
          <div>
            <p className="m-0 text-slate-700 text-base">
              Bạn có chắc chắn muốn hủy đăng ký nghỉ cho ngày{" "}
              <Text className="text-red-700! font-bold!">
                {leave ? dayjs(leave.date).format("DD/MM/YYYY") : ""}
              </Text>
              ?
            </p>
            <p className="text-sm text-red-600/80 mt-2 italic font-medium">
              * Hành động này sẽ thay đổi trạng thái ngày nghỉ thành "Đã hủy" và
              hệ thống sẽ mở lại lịch làm việc cho bạn trong ngày này.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CancelLeaveModal;
