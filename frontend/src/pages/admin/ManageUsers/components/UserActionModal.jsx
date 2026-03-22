import { Modal } from "@/components/common"; // Sử dụng Common Component
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { DatePicker, Input, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { Text } = Typography;

const UserActionModal = ({ visible, type, user, onConfirm, onCancel }) => {
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState(null);

  // Reset form khi mở modal
  useEffect(() => {
    if (visible) {
      setBanReason("");
      setBanUntil(null);
    }
  }, [visible]);

  const handleOk = () => {
    if (type === "ban") {
      if (!banReason || banReason.trim().length < 5) {
        message.error("Vui lòng nhập lý do khóa tài khoản (ít nhất 5 ký tự).");
        return;
      }
      if (!banUntil) {
        message.error("Vui lòng chọn ngày mở khóa.");
        return;
      }
      if (banUntil.isBefore(dayjs(), "day")) {
        message.error("Thời gian mở khóa phải nằm trong tương lai.");
        return;
      }
      onConfirm({
        reason: banReason.trim(),
        bannedUntil: banUntil.toISOString(),
      });
    } else {
      onConfirm();
    }
  };

  const titles = {
    ban: "Khóa tài khoản",
    unban: "Mở khóa tài khoản",
    softDelete: "Xóa tài khoản (Tạm thời)",
    hardDelete: "Xóa vĩnh viễn tài khoản",
  };

  const okTexts = {
    ban: "Khóa tài khoản",
    unban: "Mở khóa",
    softDelete: "Xóa tạm thời",
    hardDelete: "Xóa vĩnh viễn",
  };

  return (
    <Modal
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      title={
        <span className="text-lg font-bold text-slate-800">{titles[type]}</span>
      }
      okText={okTexts[type] || "Xác nhận"}
      cancelText="Hủy bỏ"
      okButtonProps={{
        danger: type !== "unban",
        className: "rounded-lg font-medium shadow-sm",
      }}
      cancelButtonProps={{ className: "rounded-lg font-medium" }}
    >
      <div className="py-2">
        {type === "ban" && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Bạn đang thực hiện khóa tài khoản{" "}
              <strong className="text-red-600">{user?.email}</strong>.
            </p>
            <div>
              <Text strong className="block mb-2 text-slate-700">
                Lý do khóa <span className="text-red-500">*</span>
              </Text>
              <Input.TextArea
                placeholder="Nhập lý do chi tiết..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="rounded-lg"
              />
            </div>
            <div>
              <Text strong className="block mb-2 text-slate-700">
                Thời gian mở khóa dự kiến{" "}
                <span className="text-red-500">*</span>
              </Text>
              <DatePicker
                placeholder="Chọn ngày"
                value={banUntil}
                onChange={(date) => setBanUntil(date)}
                disabledDate={(current) =>
                  current && current < dayjs().startOf("day")
                }
                className="w-full rounded-lg h-10"
                format="DD/MM/YYYY"
              />
            </div>
          </div>
        )}

        {type === "unban" && (
          <p className="text-slate-600 text-base">
            Bạn có chắc chắn muốn khôi phục hoạt động cho tài khoản{" "}
            <strong className="text-emerald-600">{user?.email}</strong>?
          </p>
        )}

        {type === "softDelete" && (
          <p className="text-slate-600 text-base">
            Bạn muốn xóa tài khoản{" "}
            <strong className="text-slate-800">{user?.email}</strong>? <br />
            <span className="text-sm text-slate-400 mt-2 block">
              Tài khoản sẽ được chuyển sang trạng thái ngưng hoạt động và có thể
              khôi phục sau.
            </span>
          </p>
        )}

        {type === "hardDelete" && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700">
            <div className="flex items-start gap-3">
              <ExclamationCircleOutlined className="text-xl mt-0.5" />
              <div>
                <strong className="block mb-1">CẢNH BÁO NGUY HIỂM</strong>
                Hành động này <b>không thể hoàn tác</b>. Toàn bộ dữ liệu của{" "}
                <strong>{user?.email}</strong> sẽ bị xóa vĩnh viễn khỏi hệ
                thống.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserActionModal;
