import { Modal } from "@/components/common";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Input, Typography, message } from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;

const ApplicationActionModal = ({
  visible,
  type,
  applicationName,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  const [rejectReason, setRejectReason] = useState("");

  // Reset form khi mở modal
  useEffect(() => {
    if (visible) setRejectReason("");
  }, [visible]);

  const handleOk = () => {
    if (type === "reject") {
      if (!rejectReason || rejectReason.trim().length < 10) {
        message.error("Vui lòng nhập lý do từ chối (ít nhất 10 ký tự).");
        return;
      }
      onConfirm({ reason: rejectReason.trim() });
    } else {
      onConfirm(); // Approve không cần lý do
    }
  };

  return (
    <Modal
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      title={
        <span className="text-lg font-bold text-slate-800">
          {type === "approve"
            ? "Xác nhận duyệt hồ sơ"
            : "Từ chối hồ sơ ứng viên"}
        </span>
      }
      okText={type === "approve" ? "Duyệt & Cấp tài khoản" : "Xác nhận Từ chối"}
      cancelText="Hủy bỏ"
      okButtonProps={{
        danger: type === "reject",
        className:
          type === "approve"
            ? "bg-emerald-600! hover:bg-emerald-700! font-medium! "
            : "font-medium! ",
      }}
      cancelButtonProps={{ className: "font-medium rounded-lg" }}
    >
      <div className="py-2">
        {type === "approve" ? (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800">
            <div className="flex items-start gap-3">
              <CheckCircleOutlined className="text-xl mt-0.5 text-emerald-600" />
              <div>
                <p className="mb-2">
                  Bạn có chắc chắn muốn duyệt hồ sơ của bác sĩ{" "}
                  <strong className="text-emerald-700">
                    {applicationName}
                  </strong>
                  ?
                </p>
                <p className="text-xs text-emerald-600/80 italic font-medium">
                  * Hệ thống sẽ tự động tạo mật khẩu và gửi email thông báo kèm
                  tài khoản đăng nhập cho bác sĩ.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 flex items-start gap-3">
              <CloseCircleOutlined className="text-xl mt-0.5 text-red-600" />
              <p className="m-0">
                Bạn đang thực hiện <b>từ chối</b> hồ sơ của bác sĩ{" "}
                <strong className="text-red-700">{applicationName}</strong>.
              </p>
            </div>

            <div>
              <Text strong className="block mb-2 text-slate-700">
                Lý do từ chối <span className="text-red-500">*</span>
              </Text>
              <Input.TextArea
                rows={4}
                placeholder="Vui lòng nhập lý do chi tiết (bắt buộc, ít nhất 10 ký tự)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="rounded-lg hover:border-red-300 focus:border-red-400"
              />
              <p className="text-xs text-slate-400 mt-2 italic">
                * Lý do này sẽ được đính kèm trong email thông báo gửi đến ứng
                viên.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ApplicationActionModal;
