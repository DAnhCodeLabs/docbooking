import { formatDateUTC } from "@/utils/date";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Drawer, Tag, Typography } from "antd";

const { Text, Title } = Typography;

const statusMap = {
  confirmed: { color: "processing", text: "Chờ Check-in" },
  checked_in: { color: "warning", text: "Đã check-in" },
  completed: { color: "success", text: "Hoàn thành" },
  cancelled: { color: "error", text: "Đã hủy" },
};

const AppointmentDetailDrawer = ({ visible, onClose, appointment }) => {
  if (!appointment) return null;

  return (
    <Drawer
      title={
        <span className="text-lg font-bold text-gray-800">
          Chi tiết Hồ sơ hẹn khám
        </span>
      }
      width={720}
      open={visible}
      onClose={onClose}
      footer={null}
      className="rounded-l-2xl!"
    >
      {/* Header Profile */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            size={64}
            icon={<UserOutlined />}
            className="bg-blue-100! text-blue-600!"
          />
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              Bệnh nhân
            </div>
            <Title level={4} className="m-0! text-gray-800!">
              {appointment.patientProfile.fullName}
            </Title>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Trạng thái hồ sơ</div>
          <Tag
            color={statusMap[appointment.status]?.color}
            className="m-0! rounded-md! px-3! py-1! text-sm! border-none! font-medium!"
          >
            {statusMap[appointment.status]?.text}
          </Tag>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Patient Block */}
        <Card
          size="small"
          title={
            <span className="text-gray-600 font-semibold">
              <UserOutlined className="mr-2" />
              Thông tin liên hệ
            </span>
          }
          className="shadow-sm! border-gray-200! rounded-lg!"
        >
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-gray-500 block">Số điện thoại</span>
              <span className="font-medium text-gray-800">
                {appointment.patientProfile.phone}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">
                CCCD / Định danh
              </span>
              <span className="font-medium text-gray-800">
                {appointment.patientProfile.cccd || "Chưa cập nhật"}
              </span>
            </div>
          </div>
        </Card>

        {/* Doctor Block */}
        <Card
          size="small"
          title={
            <span className="text-gray-600 font-semibold">
              <InfoCircleOutlined className="mr-2" />
              Thông tin Dịch vụ & Thanh toán
            </span>
          }
          className="shadow-sm! border-gray-200! rounded-lg!"
        >
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-gray-500 block">
                Bác sĩ phụ trách
              </span>
              <span className="font-medium text-blue-600">
                {appointment.doctor.fullName}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">
                Chuyên khoa & Cơ sở
              </span>
              <span className="font-medium text-gray-800">
                {appointment.doctor?.specialty?.name || "N/A"} -{" "}
                {appointment.doctor?.clinicName || "N/A"}
              </span>
            </div>
            {/* Thêm thông tin thanh toán */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-500 block">Phương thức</span>
                <Tag
                  color={
                    appointment.paymentMethod === "online"
                      ? "geekblue"
                      : "green"
                  }
                  className="mt-1!"
                >
                  {appointment.paymentMethod === "online"
                    ? "Trực tuyến"
                    : "Tại phòng khám"}
                </Tag>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Trạng thái</span>
                <Tag
                  color={
                    appointment.paymentStatus === "paid"
                      ? "success"
                      : appointment.paymentStatus === "failed"
                        ? "error"
                        : "default"
                  }
                  className="mt-1!"
                >
                  {appointment.paymentStatus === "paid"
                    ? "Đã thanh toán"
                    : appointment.paymentStatus === "failed"
                      ? "Thất bại"
                      : "Chưa thanh toán"}
                </Tag>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Time & Symptoms */}
      <Card
        size="small"
        className="shadow-sm! border-gray-200! rounded-lg! mb-6! bg-blue-50/30!"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-sm flex items-center">
              <CalendarOutlined className="mr-1.5" />
              Ngày hẹn
            </span>
            <span className="font-semibold text-gray-800 whitespace-nowrap text-base">
              {formatDateUTC(appointment.slot.scheduleId.date)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-sm flex items-center">
              <ClockCircleOutlined className="mr-1.5" />
              Giờ khám
            </span>
            <span className="font-semibold text-gray-800 whitespace-nowrap text-base">
              {appointment.slot.startTime} - {appointment.slot.endTime}
            </span>
          </div>
        </div>
      </Card>

      {(appointment.note ||
        appointment.symptoms ||
        appointment.cancellationReason) && (
        <Card
          size="small"
          title={
            <span className="text-gray-600 font-semibold">
              Ghi chú & Triệu chứng
            </span>
          }
          className="shadow-sm! border-gray-200! rounded-lg! mb-6!"
        >
          <div className="flex flex-col gap-4">
            {appointment.symptoms && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Mô tả triệu chứng ban đầu
                </span>
                <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm border border-gray-100">
                  {appointment.symptoms}
                </div>
              </div>
            )}
            {appointment.note && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Ghi chú thêm
                </span>
                <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm border border-gray-100">
                  {appointment.note}
                </div>
              </div>
            )}
            {appointment.cancellationReason && (
              <div>
                <span className="text-xs text-red-500 block mb-1 font-medium">
                  Lý do hủy
                </span>
                <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm border border-red-100">
                  {appointment.cancellationReason}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* QR Ticket */}
      {appointment.qrCode && appointment.status !== "cancelled" && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Mã Check-in Điện tử
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
            <img
              src={appointment.qrCode}
              alt="QR Code"
              className="w-40 h-40 object-contain"
            />
          </div>
          <Text type="secondary" className="block text-center mt-4 text-sm!">
            Đưa mã này cho lễ tân khi đến cơ sở y tế
          </Text>
        </div>
      )}
    </Drawer>
  );
};

export default AppointmentDetailDrawer;
