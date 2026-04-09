import {
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Descriptions,
  Divider,
  Drawer,
  Typography,
  message,
  Tag,
  Space,
  Card,
  Row,
  Col,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { doctorApi } from "../doctorApi";

const { Text, Title } = Typography;

const PatientDetailDrawer = ({ visible, onClose, patient }) => {
  const [loading, setLoading] = useState(false);
  const [patientDetail, setPatientDetail] = useState(null);
  const [consultationHistory, setConsultationHistory] = useState([]);

  useEffect(() => {
    const patientId = patient?.patientId || patient?.patient?.id;
    if (visible && patientId) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const res = await doctorApi.getPatientAppointments(patientId);
          setPatientDetail(res.patient);
          setConsultationHistory(res.consultationHistory || []);
        } catch (error) {
          message.error(error?.message || "Không thể tải chi tiết bệnh nhân.");
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    }
  }, [visible, patient]);

  if (!patientDetail) return null;

  const genderMap = {
    male: "Nam",
    female: "Nữ",
    other: "Khác",
  };

  const getGenderColor = (gender) => {
    if (gender === "male") return "blue";
    if (gender === "female") return "pink";
    return "default";
  };

  return (
    <Drawer
      title={null}
      width={800}
      open={visible}
      onClose={onClose}
      footer={null}
      loading={loading}
      className="rounded-t-2xl! overflow-hidden!"
      styles={{ body: { padding: 0 } }}
    >
      {/* Header với gradient */}
      <div className="bg-linear-to-r! from-blue-700! to-blue-500! px-6! py-5! text-white!">
        <div className="flex items-center gap-4">
          <Avatar
            size={64}
            icon={<UserOutlined />}
            className="bg-white! text-blue-700!"
          />
          <div>
            <Title level={4} className="text-white! m-0!">
              {patientDetail.fullName}
            </Title>
            <Space className="mt-1!">
              <Tag color={getGenderColor(patientDetail.gender)}>
                {genderMap[patientDetail.gender]}
              </Tag>
              {patientDetail.dateOfBirth && (
                <Tag icon={<CalendarOutlined />} color="cyan">
                  {dayjs(patientDetail.dateOfBirth).format("DD/MM/YYYY")}
                </Tag>
              )}
            </Space>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="px-6! py-6! max-h-[80vh] overflow-y-auto">
        {/* Thông tin cá nhân */}
        <Card
          className="mb-6! border-l-4! border-l-blue-500! shadow-sm!"
          styles={{ body: { padding: "16px" } }}
        >
          <div className="flex items-center gap-2 mb-4">
            <UserOutlined className="text-blue-600!" />
            <Text strong className="text-base!">
              Thông tin cá nhân
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className="flex items-center gap-2">
                <PhoneOutlined className="text-gray-400!" />
                <Text type="secondary">Số điện thoại:</Text>
                <Text strong>{patientDetail.phone}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="flex items-center gap-2">
                <IdcardOutlined className="text-gray-400!" />
                <Text type="secondary">CCCD:</Text>
                <Text strong>{patientDetail.cccd}</Text>
              </div>
            </Col>
            <Col xs={24}>
              <div className="flex items-center gap-2">
                <EnvironmentOutlined className="text-gray-400!" />
                <Text type="secondary">Địa chỉ:</Text>
                <Text strong>{patientDetail.address || "Chưa cập nhật"}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Lịch sử khám bệnh */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MedicineBoxOutlined className="text-green-600!" />
            <Text strong className="text-base!">
              Lịch sử khám bệnh
            </Text>
          </div>
          {consultationHistory.length === 0 ? (
            <Card className="text-center! py-8! border-dashed!">
              <Text type="secondary">Chưa có lịch sử khám.</Text>
            </Card>
          ) : (
            <div className="space-y-4">
              {consultationHistory.map((item, idx) => (
                <Card
                  key={idx}
                  className="hover:shadow-md! transition-all! duration-200! border-gray-200!"
                  styles={{ body: { padding: "16px" } }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-3">
                    <Space>
                      <ClockCircleOutlined className="text-blue-500!" />
                      <Text strong>
                        {dayjs(item.appointmentDate).format("DD/MM/YYYY")}
                      </Text>
                      <Text type="secondary">({item.appointmentTime})</Text>
                    </Space>
                    {item.followUpDate && (
                      <Tag color="orange" icon={<CalendarOutlined />}>
                        Tái khám:{" "}
                        {dayjs(item.followUpDate).format("DD/MM/YYYY")}
                      </Tag>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FileTextOutlined className="text-gray-400! mt-1!" />
                      <div>
                        <Text type="secondary">Chẩn đoán:</Text>{" "}
                        <Text>{item.diagnosis}</Text>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <MedicineBoxOutlined className="text-gray-400! mt-1!" />
                      <div>
                        <Text type="secondary">Đơn thuốc:</Text>{" "}
                        <Text>
                          {item.prescription?.length
                            ? item.prescription
                                .map((med) => `${med.drugName} (${med.dosage})`)
                                .join("; ")
                            : "Không có thuốc"}
                        </Text>
                      </div>
                    </div>

                    {item.instructions && (
                      <div className="flex gap-2">
                        <CheckCircleOutlined className="text-gray-400! mt-1!" />
                        <div>
                          <Text type="secondary">Hướng dẫn:</Text>{" "}
                          <Text>{item.instructions}</Text>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default PatientDetailDrawer;
