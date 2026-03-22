import { ActionButtons, Filter, Search, Table } from "@/components/common";
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import CategoryActionModal from "./CategoryActionModal";
import CategoryDetailDrawer from "./CategoryDetailDrawer";
import CategoryFormDrawer from "./CategoryFormDrawer";
import { specialtyService } from "./specialtyService";

const { Title, Text } = Typography;

const Categories = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({});

  // States Popup
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailCategory, setDetailCategory] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalState, setModalState] = useState({
    visible: false,
    category: null,
    isSubmitting: false,
  });

  // Fetch API
  const fetchSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        // MASTER DEV FIX: Luôn có giá trị dự phòng để Axios không bao giờ cắt mất param
        page: pagination.current || 1,
        limit: pagination.pageSize || 10,
        search: searchText,
        ...filters,
      };
      const response = await specialtyService.getSpecialties(params);
      setData(response.specialties || []);
      setPagination((prev) => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      console.error("Lỗi:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, filters]);

  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // Handlers thêm/sửa
  const handleAddCategory = () => {
    setEditingCategory(null);
    setDrawerVisible(true);
  };
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setDrawerVisible(true);
  };

  const handleDrawerSubmit = async (formData) => {
    try {
      if (editingCategory) {
        await specialtyService.updateSpecialty(editingCategory._id, formData);
      } else {
        await specialtyService.createSpecialty(formData);
      }
      setDrawerVisible(false);
      fetchSpecialties();
    } catch (error) {
      console.error("Lỗi khi lưu danh mục:", error);
    }
  };

  // Handler Khóa/Mở khóa
  const handleConfirmDelete = async () => {
    if (!modalState.category) return;
    setModalState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const action =
        modalState.category.status === "active" ? "deactivate" : "reactivate";
      await specialtyService.toggleSpecialtyStatus(
        modalState.category._id,
        action,
      );
      setModalState({ visible: false, category: null, isSubmitting: false });
      fetchSpecialties();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Cấu hình Cột (Bọc Giao diện hiện đại)
  const columns = [
    {
      title: "Thông tin danh mục",
      key: "info",
      render: (_, record) => (
        <div className="flex items-center gap-4">
          <Avatar
            src={record.image}
            shape="square"
            size={52}
            icon={!record.image && <AppstoreOutlined className="text-xl!" />}
            className="bg-indigo-50! text-indigo-500! border! border-indigo-100! "
          />
          <div>
            <div className="font-bold! text-slate-800! text-base! mb-0.5!">
              {record.name}
            </div>
            <div className="text-xs text-slate-500 font-medium truncate w-48 sm:w-64">
              {record.description || "Không có mô tả"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status) => (
        <Tag
          color={status === "active" ? "success" : "default"}
          className="border-none! rounded-md! px-2! font-medium!"
        >
          {status === "active" ? "Hoạt động" : "Ngưng hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const isActive = record.status === "active";
        return (
          <ActionButtons
            items={[
              {
                key: "view",
                icon: <EyeOutlined className="text-slate-600!" />,
                onClick: () => {
                  setDetailCategory(record);
                  setDetailVisible(true);
                },
              },
              {
                key: "edit",
                icon: <EditOutlined className="text-slate-600!" />,
                onClick: () => handleEditCategory(record),
              },
              {
                key: "delete",
                icon: isActive ? (
                  <DeleteOutlined className="text-red-600!" />
                ) : (
                  <ReloadOutlined className="text-emerald-600!" />
                ),
                danger: isActive,
                onClick: () =>
                  setModalState({
                    visible: true,
                    category: record,
                    isSubmitting: false,
                  }),
              },
            ]}
            size="middle"
          />
        );
      },
    },
  ];

  const filterConfig = [
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Hoạt động", value: "active" },
        { label: "Ngưng hoạt động", value: "inactive" },
      ],
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Tiêu đề trang */}
      <div className="mb-6">
        <Title level={3} className="mb-1! text-slate-800!">
          Quản lý Dịch vụ & Chuyên khoa
        </Title>
        <Text className="text-slate-500!">
          Quản lý và thiết lập danh mục khám bệnh trên hệ thống.
        </Text>
      </div>

      {/* Thanh công cụ (Toolbar Card) */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
        <div className="w-full xl:w-96">
          <Search
            value={searchText}
            onSearch={handleSearch}
            placeholder="Tìm kiếm theo tên danh mục..."
            className="w-full! "
          />
        </div>
        <div className="flex w-full xl:w-auto gap-3 flex-col sm:flex-row">
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={() => handleFilterChange({})}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddCategory}
            className="bg-indigo-600! hover:bg-indigo-700! border-none! font-semibold!  h-10! shadow-sm! shadow-indigo-600/20!"
          >
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Bảng Dữ liệu (Table Card) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            className: "px-6! py-4!",
            // Xử lý khi bấm chuyển trang (1, 2, 3...)
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize,
              }));
            },
            // Xử lý khi đổi số lượng hiển thị (10, 20, 50 / trang)
            onShowSizeChange: (current, size) => {
              setPagination((prev) => ({
                ...prev,
                current: 1,
                pageSize: size,
              }));
            },
          }}
          scroll={{ x: 700 }}
        />
      </div>

      {/* Các thành phần Popups */}
      <CategoryDetailDrawer
        visible={detailVisible}
        category={detailCategory}
        onClose={() => setDetailVisible(false)}
      />

      <CategoryFormDrawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSubmit={handleDrawerSubmit}
        initialValues={editingCategory}
      />

      <CategoryActionModal
        visible={modalState.visible}
        category={modalState.category}
        isSubmitting={modalState.isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setModalState({ visible: false, category: null, isSubmitting: false })
        }
      />
    </div>
  );
};

export default Categories;
