import { Modal } from "@/components/common";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { Input, Typography } from "antd";

const { Text } = Typography;

const LeadActionModal = ({
  visible,
  type,
  lead,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}) => {
  const getTitle = () => {
    switch (type) {
      case "approve":
        return "Xác nhận duyệt hồ sơ";
      case "reject":
        return "Từ chối hồ sơ đối tác";
      case "lock":
        return "Khóa phòng khám";
      case "delete":
        return "Xóa phòng khám";
      default:
        return "";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "approve":
        return <CheckCircleOutlined className="text-xl! text-emerald-600!" />;
      case "reject":
        return <CloseCircleOutlined className="text-xl! text-red-600!" />;
      case "lock":
        return <LockOutlined className="text-xl! text-orange-600!" />;
      case "delete":
        return <DeleteOutlined className="text-xl! text-red-600!" />;
      default:
        return null;
    }
  };

  const getMessage = () => {
    switch (type) {
      case "approve":
        return (
          <>
            Xác nhận phê duyệt hợp tác cho phòng khám{" "}
            <Text className="text-emerald-700! font-bold!">
              {lead?.clinicName}
            </Text>
            ?
            <p className="text-sm text-emerald-600/80 mt-2 italic font-medium">
              * Trạng thái sẽ được cập nhật thành "Hoạt động". Hệ thống sẽ tự
              động tạo Hợp đồng PDF và gửi qua email cho đối tác.
            </p>
          </>
        );
      case "reject":
        return (
          <>
            Bạn đang từ chối hồ sơ đăng ký của{" "}
            <Text className="text-red-700! font-bold!">{lead?.clinicName}</Text>
            .
          </>
        );
      case "lock":
        return (
          <>
            Bạn có chắc muốn khóa phòng khám{" "}
            <Text className="text-orange-700! font-bold!">
              {lead?.clinicName}
            </Text>
            ?
            <p className="text-sm text-orange-600/80 mt-2 italic font-medium">
              * Phòng khám sẽ không xuất hiện trong danh sách công khai cho đến
              khi được mở khóa.
            </p>
          </>
        );
      case "delete":
        return (
          <>
            Bạn có chắc muốn xóa phòng khám{" "}
            <Text className="text-red-700! font-bold!">{lead?.clinicName}</Text>
            ?
            <p className="text-sm text-red-600/80 mt-2 italic font-medium">
              * Thao tác này không thể hoàn tác. Dữ liệu sẽ được vô hiệu hóa
              vĩnh viễn.
            </p>
          </>
        );
      default:
        return null;
    }
  };

  const needReason = type === "reject" || type === "lock" || type === "delete";

  return (
    <Modal
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          {getTitle()}
        </span>
      }
      okText="Xác nhận"
      cancelText="Hủy bỏ"
      okButtonProps={{
        danger: type === "reject" || type === "delete",
        className:
          type === "approve"
            ? "bg-emerald-600! hover:bg-emerald-700! border-none!  font-medium! shadow-sm!"
            : type === "lock"
              ? "bg-orange-600! hover:bg-orange-700! border-none!  font-medium! shadow-sm!"
              : " font-medium! shadow-sm!",
      }}
    >
      <div className="py-2">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
          {getIcon()}
          <div>
            <p className="m-0 text-slate-700 text-base">{getMessage()}</p>
          </div>
        </div>

        {needReason && (
          <div className="mt-4">
            <Text className="font-semibold! text-slate-700! block! mb-2!">
              {type === "reject"
                ? "Lý do từ chối (tùy chọn)"
                : type === "lock"
                  ? "Lý do khóa (bắt buộc)"
                  : "Lý do xóa (tùy chọn)"}
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do chi tiết..."
              value={reason}
              onChange={onReasonChange}
              className="bg-slate-50!  border-slate-200! hover:border-orange-300! focus:border-orange-400! transition-colors! p-3!"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LeadActionModal;
