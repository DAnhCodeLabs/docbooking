import { Modal } from "@/components/common";
import { ExclamationCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

const CategoryActionModal = ({
  visible,
  category,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  const isActive = category?.status === "active";

  return (
    <Modal
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          {isActive ? "Xác nhận ngưng hoạt động" : "Xác nhận khôi phục"}
        </span>
      }
      okText={isActive ? "Ngưng hoạt động" : "Khôi phục danh mục"}
      cancelText="Hủy bỏ"
      okButtonProps={{
        danger: isActive,
        className: isActive
          ? " font-medium! shadow-sm!"
          : "bg-emerald-600! hover:bg-emerald-700! border-none!  font-medium! shadow-sm!",
      }}
      cancelButtonProps={{ className: " font-medium!" }}
    >
      <div className="py-2">
        {isActive ? (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
            <ExclamationCircleOutlined className="text-xl! mt-0.5! text-red-600!" />
            <div>
              <p className="m-0 text-slate-700 text-base">
                Bạn có chắc chắn muốn ngưng hoạt động danh mục{" "}
                <Text className="text-red-700! font-bold!">
                  {category?.name}
                </Text>
                ?
              </p>
              <p className="text-sm text-red-600/80 mt-2 italic font-medium">
                * Dịch vụ này sẽ bị ẩn khỏi người dùng nhưng có thể khôi phục
                lại sau.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <ReloadOutlined className="text-xl! mt-0.5! text-emerald-600!" />
            <div>
              <p className="m-0 text-slate-700 text-base">
                Bạn đang khôi phục hoạt động cho danh mục{" "}
                <Text className="text-emerald-700! font-bold!">
                  {category?.name}
                </Text>
                .
              </p>
              <p className="text-sm text-emerald-600/80 mt-2 italic font-medium">
                * Sau khi khôi phục, bệnh nhân có thể tiếp tục đặt lịch cho dịch
                vụ này.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryActionModal;
