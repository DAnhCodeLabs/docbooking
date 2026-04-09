import { formatDateUTC } from "@/utils/date";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Space, Table, Tag, Typography } from "antd";

const { Text } = Typography;

const AppointmentsTable = ({
  appointments,
  loading,
  pagination,
  setPagination,
  statusMap,
  onOpenDetail,
  onOpenCancel,
  onOpenComplete, // THÊM PROP NÀY VÀO ĐÂY
  userRole,
  currentUserId,
}) => {
  const columns = [
    {
      title: "Mã/STT",
      key: "index",
      width: 70,
      render: (_, __, index) => (
        <span className="text-gray-500 text-xs">
          #{(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "Thông tin Bệnh nhân",
      key: "patient",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            className="bg-blue-50! text-blue-600! border! border-blue-200!"
            icon={<UserOutlined />}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 leading-tight">
              {record.patientProfile.fullName}
            </span>
            <span className="text-xs text-gray-500">
              {record.patientProfile.phone} •{" "}
              {record.patientProfile.cccd || "N/A"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Bác sĩ phụ trách",
      dataIndex: ["doctor", "fullName"],
      key: "doctorName",
      render: (name) => (
        <span className="font-medium text-gray-700">{name}</span>
      ),
      responsive: ["md"],
    },
    {
      title: "Lịch hẹn",
      key: "datetime",
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800">
            {formatDateUTC(record.scheduleInfo?.date)}
          </span>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit mt-1 border border-blue-100">
            {record.slot.startTime} - {record.slot.endTime}
          </span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => (
        <Tag
          color={statusMap[status]?.color}
          className="m-0! rounded-md! px-2! py-1! font-medium! border-none!"
        >
          {statusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: "PT thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 120,
      render: (method) => {
        const text = method === "online" ? "Trực tuyến" : "Tại phòng khám";
        const color = method === "online" ? "geekblue" : "green";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "TT thanh toán",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 120,
      render: (status) => {
        let color = "default";
        let text = "Chưa thanh toán";
        if (status === "paid") {
          color = "success";
          text = "Đã thanh toán";
        } else if (status === "failed") {
          color = "error";
          text = "Thất bại";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200, // Tăng width một chút để chứa 3 nút
      align: "right",
      render: (_, record) => {
        const isDoctor = userRole === "doctor";
        const isPatient = userRole === "patient";
        const doctorId = record.doctor?._id ? String(record.doctor._id) : null;
        const bookingUserId = record.bookingUser?._id
          ? String(record.bookingUser._id)
          : null;
        const cUserId = String(currentUserId);

        const isOwnDoctor = isDoctor && doctorId === cUserId;
        const isOwnPatient = isPatient && bookingUserId === cUserId;
        const canCancel =
          (isOwnPatient || isOwnDoctor) && record.status === "confirmed";

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onOpenDetail(record)}
              className="text-blue-600! hover:bg-blue-50!"
            >
              Xem
            </Button>
            {userRole === "doctor" && record.status === "checked_in" && (
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => onOpenComplete(record)}
                className="text-green-600! hover:bg-green-50!"
              >
                Kết luận
              </Button>
            )}
            {canCancel && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onOpenCancel(record)}
                className="hover:bg-red-50!"
              >
                Hủy
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card className="shadow-sm! border-gray-200! rounded-xl! overflow-hidden! p-0!">
      <Table
        columns={columns}
        dataSource={appointments}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          className: "px-4! pb-4!",
        }}
        onChange={(newPagination) =>
          setPagination({
            ...pagination,
            current: newPagination.current,
            pageSize: newPagination.pageSize,
          })
        }
        className="[&_.ant-table-thead_th]:bg-gray-50! [&_.ant-table-thead_th]:text-gray-500! [&_.ant-table-thead_th]:font-semibold!"
      />
    </Card>
  );
};

export default AppointmentsTable;
