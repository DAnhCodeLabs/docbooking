import { Modal } from "antd";

const ActionModal = ({ confirmModal, setConfirmModal, onOk, onCancel }) => {
  const { visible, doctor, type, reason } = confirmModal;

  const isConfirm = type === "confirm";

  return (
    <Modal
      title={isConfirm ? "Xác nhận hồ sơ bác sĩ" : "Từ chối hồ sơ bác sĩ"}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={isConfirm ? "Xác nhận chuyển Admin" : "Từ chối hồ sơ"}
      okButtonProps={
        !isConfirm ? { danger: true } : { className: "bg-blue-600!" }
      }
      centered
      className=" overflow-hidden!"
    >
      <div className="py-4">
        {isConfirm ? (
          <p className="text-gray-600 text-base">
            Bạn có chắc chắn muốn xác nhận bác sĩ{" "}
            <strong className="text-gray-900">{doctor?.user?.fullName}</strong>?
            Hồ sơ này sẽ được chuyển đến Quản trị viên nền tảng để duyệt lần
            cuối.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-gray-600 text-base">
              Bạn có chắc chắn muốn từ chối bác sĩ{" "}
              <strong className="text-gray-900">
                {doctor?.user?.fullName}
              </strong>
              ?
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              rows={3}
              placeholder="Vui lòng nhập lý do từ chối để bác sĩ biết (Tùy chọn)..."
              value={reason}
              onChange={(e) =>
                setConfirmModal((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ActionModal;
