import { Typography } from "antd";
import {
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  MailOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const DoctorContactPanel = () => {
  return (
    <div className="bg-blue-500 w-full h-full p-8 md:p-12 relative overflow-hidden flex flex-col justify-center text-white">
      {/* Hiệu ứng vòng tròn trang trí (Decorative circles) */}
      <div className="absolute -bottom-16 -left-16 w-64 h-64 border-30 border-blue-400/30 rounded-full"></div>
      <div className="absolute top-10 right-10 w-20 h-20 bg-blue-400/20 rounded-full blur-xl"></div>

      <div className="relative z-10">
        <Title
          level={2}
          className="text-white! font-bold! mb-10 text-center md:text-left"
        >
          Hợp tác cùng DocGo
        </Title>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-md">
              <PhoneOutlined className="text-xl" />
            </div>
            <div>
              <Text className="text-blue-100! block text-sm mb-1 font-medium">
                Hotline Hỗ trợ Y Bác sĩ
              </Text>
              <Text className="text-white! font-bold text-lg">
                1900 2115 - Phím 2
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-md">
              <EnvironmentOutlined className="text-xl" />
            </div>
            <div>
              <Text className="text-blue-100! block text-sm mb-1 font-medium">
                Văn phòng đại diện
              </Text>
              <Text className="text-white! font-medium leading-relaxed">
                Tòa nhà Y Tế Việt, 123 Đường X, <br />
                Quận Y, TP. Hà Nội
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-md">
              <ClockCircleOutlined className="text-xl" />
            </div>
            <div>
              <Text className="text-blue-100! block text-sm mb-1 font-medium">
                Thời gian tiếp nhận hồ sơ
              </Text>
              <Text className="text-white! font-medium">
                8:00 - 17:00 (Thứ 2 - Thứ 6)
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-md">
              <MailOutlined className="text-xl" />
            </div>
            <div>
              <Text className="text-blue-100! block text-sm mb-1 font-medium">
                Email liên hệ
              </Text>
              <Text className="text-white! font-medium">doitac@docgo.vn</Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorContactPanel;
