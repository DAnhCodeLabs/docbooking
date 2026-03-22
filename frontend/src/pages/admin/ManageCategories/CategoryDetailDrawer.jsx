import { Avatar, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Drawer, EmptyState } from "@/components/common";
import dayjs from "dayjs";

const { Text } = Typography;

const CategoryDetailDrawer = ({ visible, category, onClose }) => {
  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <span className="font-bold! text-slate-800! text-lg!">
          Chi tiết Danh mục
        </span>
      }
      width={450}
      footer={null}
      styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }}
    >
      {category ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Cover Header (Dùng thẻ div chuẩn Tailwind không có !) */}
          <div className="bg-linear-to-r from-indigo-500 to-purple-500 h-28 w-full"></div>

          {/* Avatar & Basic Info */}
          <div className="px-6 pb-6 relative bg-white shadow-sm border-b border-slate-100">
            <div className="absolute -top-12">
              <Avatar
                src={category.image}
                size={88}
                shape="square"
                icon={
                  !category.image && <AppstoreOutlined className="text-3xl!" />
                }
                className="border-4! border-white! shadow-md! bg-indigo-50! text-indigo-500! rounded-2xl!"
              />
            </div>
            <div className="pt-14">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                {category.name}
              </h2>
              <div className="flex items-center gap-2">
                <Tag
                  color={category.status === "active" ? "success" : "default"}
                  className="rounded-md! border-none! px-3! py-1! text-xs! font-bold! uppercase! tracking-wide! m-0!"
                >
                  {category.status === "active"
                    ? "Hoạt động"
                    : "Ngưng hoạt động"}
                </Tag>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto">
                  <ClockCircleOutlined className="text-slate-400!" />
                  Tạo lúc: {dayjs(category.createdAt).format("DD/MM/YYYY")}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <InfoCircleOutlined className="text-indigo-500!" />
                <Text className="font-bold! text-slate-700! uppercase! text-xs! tracking-wider!">
                  Mô tả chi tiết
                </Text>
              </div>
              <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {category.description || (
                  <span className="italic text-slate-400">
                    Chưa có thông tin mô tả cho danh mục này.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState description="Không có dữ liệu danh mục" />
      )}
    </Drawer>
  );
};

export default CategoryDetailDrawer;
