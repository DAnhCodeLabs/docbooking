import Loading from "@/components/Loading";
import {
  DollarOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Divider, Tag, Typography } from "antd";

const { Title, Text } = Typography;

const DoctorInfoCard = ({ doctor }) => {
  if (!doctor || !doctor.user) {
    return (
      <Card className="shadow-sm! border-gray-200! rounded-2xl! overflow-hidden!">
        <div className="flex justify-center items-center p-8">
          <Loading />
        </div>
      </Card>
    );
  }
  return (
    <Card className="shadow-sm! border-gray-200! rounded-2xl! overflow-hidden!">
      <div className="flex flex-col items-center text-center mt-4">
        <Avatar
          size={110}
          src={doctor.user.avatar}
          icon={!doctor.user.avatar && <UserOutlined />}
          className="border-4! border-blue-50! shadow-sm! mb-4!"
        />
        <Title level={4} className="m-0! text-gray-800!">
          {doctor.user.fullName}
        </Title>
        <Tag
          color="blue"
          className="mt-2! px-3! py-1! rounded-full! border-blue-200! text-blue-700! bg-blue-50!"
        >
          {doctor.specialty.name}
        </Tag>
      </div>

      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm flex items-center gap-2">
            <SafetyCertificateOutlined className="text-blue-500!" /> Kinh nghiệm
          </span>
          <span className="font-semibold text-gray-800">
            {doctor.experience} năm
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm flex items-center gap-2">
            <DollarOutlined className="text-green-500!" /> Phí khám
          </span>
          <span className="font-bold text-green-600 text-base">
            {doctor.consultationFee?.toLocaleString()} đ
          </span>
        </div>
      </div>

      <Divider className="my-5! border-gray-200!" />

      <div className="space-y-3">
        <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
          Cơ sở y tế
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1">
            <EnvironmentOutlined className="text-lg!" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">
              {doctor.clinicId.clinicName}
            </span>
            <span className="text-gray-500 text-sm mt-1 leading-relaxed">
              {doctor.clinicId.address}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DoctorInfoCard;
