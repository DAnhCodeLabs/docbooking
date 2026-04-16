import { ActionButtons, Filter, Search, Table } from "@/components/common"; // Tái sử dụng toàn bộ Common
import {
  DeleteOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import UserActionModal from "./components/UserActionModal";
import UserDetailDrawer from "./components/UserDetailDrawer";
import { userService } from "./userService";

const { Title, Text } = Typography;

const roleMap = {
  patient: { color: "blue", text: "Bệnh nhân" },
  doctor: { color: "cyan", text: "Bác sĩ" },
  admin: { color: "purple", text: "Quản trị" },
  clinic_admin: { color: "geekblue", text: "Quản trị bệnh viện" },
};

const statusMap = {
  active: { color: "success", text: "Hoạt động" },
  inactive: { color: "default", text: "Ngưng hoạt động" },
  banned: { color: "error", text: "Bị khóa" },
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({});

  // States UI
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalState, setModalState] = useState({
    visible: false,
    type: null,
    user: null,
  });

  // Call API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        ...filters,
      };
      const response = await userService.getUsers(params);
      setUsers(response.users);
      setPagination((prev) => ({ ...prev, total: response.total }));
    } catch (error) {
      message.error("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers
  const handleTableChange = (pagInfo) =>
    setPagination((prev) => ({
      ...prev,
      current: pagInfo.current,
      pageSize: pagInfo.pageSize,
    }));
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };
  const handleFilterClear = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleViewDetail = async (user) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const data = await userService.getUserById(user._id);
      setDetailUser(data);
    } catch (error) {
      message.error("Không thể tải thông tin chi tiết.");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmAction = async (payload) => {
    setModalState((prev) => ({ ...prev, visible: false }));
    try {
      const userId = modalState.user._id;
      if (modalState.type === "ban") await userService.banUser(userId, payload);
      else if (modalState.type === "unban") await userService.unbanUser(userId);
      else if (modalState.type === "softDelete")
        await userService.softDeleteUser(userId);
      fetchUsers();
    } catch (error) {
      message.error("Thao tác thất bại.");
    }
  };

  // Cấu hình Filter dùng chung cho Component <Filter />
  const filterConfig = [
    {
      name: "role",
      label: "Vai trò",
      type: "select",
      options: [
        { label: "Bệnh nhân", value: "patient" },
        { label: "Bác sĩ", value: "doctor" },
        { label: "Quản trị", value: "admin" },
        { label: "Bệnh viện", value: "clinic_admin" },
      ],
    },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Hoạt động", value: "active" },
        { label: "Ngưng hoạt động", value: "inactive" },
        { label: "Bị khóa", value: "banned" },
      ],
    },
    { name: "createdAt", label: "Ngày tạo", type: "date-range" },
  ];

  // Cấu hình Cột Table
  const columns = useMemo(
    () => [
      {
        title: "Hồ sơ Người dùng",
        key: "profile",
        render: (_, record) => (
          <div className="flex items-center gap-3">
            <Avatar
              src={record.avatar}
              icon={!record.avatar && <UserOutlined />}
              className="bg-blue-100 text-blue-600 border border-blue-200"
            />
            <div>
              <div className="font-semibold text-slate-800">
                {record.fullName}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {record.email}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Số điện thoại",
        dataIndex: "phone",
        responsive: ["md"],
        render: (phone) => (
          <span className="text-slate-600 font-medium">{phone || "—"}</span>
        ),
      },
      {
        title: "Vai trò",
        dataIndex: "role",
        render: (role) => (
          <Tag
            color={roleMap[role]?.color}
            className="border-none rounded-md px-2 font-medium"
          >
            {roleMap[role]?.text}
          </Tag>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        render: (status) => (
          <Tag
            color={statusMap[status]?.color}
            className="border-none rounded-md px-2 font-medium"
          >
            {statusMap[status]?.text}
          </Tag>
        ),
      },
      {
        title: "Ngày tạo",
        dataIndex: "createdAt",
        responsive: ["lg"],
        render: (date) => (
          <span className="text-slate-600">
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 150,
        render: (_, record) => (
          // SỬ DỤNG LẠI ACTION BUTTONS CỦA COMMON ĐÚNG YÊU CẦU
          <ActionButtons
            items={[
              {
                key: "view",
                icon: <EyeOutlined />,
                onClick: () => handleViewDetail(record),
              },
              {
                key: record.status === "banned" ? "unban" : "ban",
                icon:
                  record.status === "banned" ? (
                    <UnlockOutlined />
                  ) : (
                    <LockOutlined />
                  ),
                onClick: () =>
                  setModalState({
                    visible: true,
                    type: record.status === "banned" ? "unban" : "ban",
                    user: record,
                  }),
              },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () =>
                  setModalState({
                    visible: true,
                    type: "softDelete",
                    user: record,
                  }),
              },
            ]}
            size="middle"
          />
        ),
      },
    ],
    [],
  );

  return (
    <div className="animate-fade-in">
      {/* Tiêu đề trang */}
      <div className="mb-6">
        <Title level={3} className="mb-1! text-slate-800!">
          Quản lý Tài khoản
        </Title>
        <Text className="text-slate-500">
          Giám sát và phân quyền người dùng trên hệ thống DocGo.
        </Text>
      </div>

      {/* Toolbar Điều hướng (Bọc trong thẻ Card sáng màu) */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
        <div className="w-full xl:w-96">
          {/* Component Search dùng chung */}
          <Search
            value={searchText}
            onSearch={handleSearch}
            placeholder="Tìm kiếm email, họ tên, SĐT..."
          />
        </div>

        <div className="w-full xl:w-auto">
          {/* Component Filter dùng chung */}
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={handleFilterClear}
          />
        </div>
      </div>

      {/* Vùng chứa Table (Bọc Card) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Component Table dùng chung */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            className: "px-6! py-4!",
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }} // Đảm bảo không vỡ bảng trên Mobile
        />
      </div>

      <UserDetailDrawer
        visible={detailVisible}
        user={detailUser}
        loading={detailLoading}
        onClose={() => setDetailVisible(false)}
      />

      <UserActionModal
        visible={modalState.visible}
        type={modalState.type}
        user={modalState.user}
        onConfirm={handleConfirmAction}
        onCancel={() =>
          setModalState({ visible: false, type: null, user: null })
        }
      />
    </div>
  );
};

export default ManageUsers;
