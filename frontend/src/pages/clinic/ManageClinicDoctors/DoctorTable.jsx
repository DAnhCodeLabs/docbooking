import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Space, Table, Tag } from "antd";

const DoctorTable = ({
  doctors,
  loading,
  pagination,
  setPagination,
  onRowClick,
  onConfirm,
  onReject,
  statusMap,
}) => {
  const columns = [
    {
      title: "Thông tin bác sĩ",
      key: "info",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={record.user.avatar}
            icon={!record.user.avatar && <UserOutlined />}
            className="border-gray-200! border-solid! border!"
            size="large"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">
              {record.user.fullName}
            </span>
            <span className="text-xs text-gray-500">{record.user.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Chuyên khoa",
      dataIndex: ["specialty", "name"],
      key: "specialty",
      responsive: ["sm"],
      render: (text) => (
        <span className="font-medium text-gray-700">{text}</span>
      ),
    },
    {
      title: "Kinh nghiệm",
      dataIndex: "experience",
      key: "experience",
      responsive: ["md"],
      render: (exp) => `${exp} năm`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={statusMap[status]?.color}
          className="rounded-md! px-2! py-1!"
        >
          {statusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space size="middle" className="flex-wrap!">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onRowClick(record)}
            className="text-blue-600! hover:bg-blue-50!"
          >
            Chi tiết
          </Button>
          {record.status === "pending" && (
            <>
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => onConfirm(record)}
                className="text-green-600! hover:bg-green-50!"
              >
                Duyệt
              </Button>
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => onReject(record)}
                className="hover:bg-red-50!"
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card className=" shadow-sm! border-gray-200! overflow-hidden!">
      <div className="overflow-x-auto w-full">
        <Table
          columns={columns}
          dataSource={doctors}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, current: page, pageSize }),
            className: "pr-4!", // Cách lề phải một chút cho đẹp
          }}
          className="whitespace-nowrap!"
        />
      </div>
    </Card>
  );
};

export default DoctorTable;
