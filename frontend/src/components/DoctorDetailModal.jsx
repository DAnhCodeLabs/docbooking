import {
  BookOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Empty, Image, Modal, Tag, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

// Component hiển thị bằng cấp
const QualificationsList = ({ qualifications }) => {
  if (!qualifications || qualifications.length === 0) {
    return <Text type="secondary">Chưa cập nhật</Text>;
  }
  return (
    <ul className="list-disc pl-5 text-slate-700">
      {qualifications.map((q, idx) => (
        <li key={idx}>
          {q.degree} - {q.institution} ({q.year})
        </li>
      ))}
    </ul>
  );
};

// Component gallery ảnh hoạt động
const ActivityGallery = ({ images, visible, onClose }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title="Ảnh hoạt động của bác sĩ"
      width={800}
      centered
    >
      {images && images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <Image
              key={idx}
              src={img.url}
              alt={`activity-${idx}`}
              className="rounded-lg object-cover h-40 w-full"
              preview={{ mask: "Xem" }}
            />
          ))}
        </div>
      ) : (
        <Empty description="Bác sĩ chưa có ảnh hoạt động" />
      )}
    </Modal>
  );
};

const InfoBlock = ({ icon, label, value, valueColor = "text-slate-800" }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100 mt-0.5">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
        {label}
      </div>
      <div className={`text-sm font-semibold ${valueColor} leading-snug`}>
        {value}
      </div>
    </div>
  </div>
);

const DoctorDetailModal = ({ visible, doctor, onClose }) => {
  const navigate = useNavigate();
  const [galleryVisible, setGalleryVisible] = useState(false);

  if (!doctor) return null;

  const clinicName =
    doctor.clinicId?.clinicName ||
    doctor.customClinicName ||
    "Chưa cập nhật nơi công tác";
  const clinicAddress =
    doctor.clinicId?.address || "Liên hệ để biết địa chỉ chi tiết";

  return (
    <>
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        closable={false}
        centered
        width={700}
        styles={{ body: { padding: 0, maxHeight: "80vh", overflowY: "auto" } }}
        className="rounded-2xl! overflow-hidden! shadow-xl!"
      >
        <div className="flex flex-col w-full relative">
          {/* Nút Đóng */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer border-none"
          >
            <CloseOutlined className="text-sm!" />
          </button>

          {/* HEADER */}
          <div className="p-6 sm:p-8 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar
              size={{ xs: 90, sm: 110 }}
              shape="square"
              src={doctor.user?.avatar}
              icon={
                !doctor.user?.avatar && <UserOutlined className="text-4xl!" />
              }
              className="w-26! h-26! border! border-slate-200! bg-slate-50! text-slate-400! rounded-2xl! shrink-0! object-cover! object-top!"
            />
            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0 w-full">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                BS. {doctor.user?.fullName || "Chưa cập nhật"}
              </h2>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                <Tag
                  color="blue"
                  className="rounded-full! border-none! px-3! py-0.5! font-medium! m-0!"
                >
                  {doctor.specialty?.name || "Chưa phân khoa"}
                </Tag>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                  <SafetyCertificateOutlined className="text-sm!" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    Đã xác minh
                  </span>
                </div>
              </div>

              <div className="text-sm text-slate-500 line-clamp-2">
                <EnvironmentOutlined className="mr-1!" />
                {clinicName} - {clinicAddress}
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="p-6 sm:p-8 bg-slate-50 flex flex-col gap-5">
            {/* 2 cột thông tin cơ bản */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoBlock
                icon={
                  <ClockCircleOutlined className="text-slate-500! text-lg!" />
                }
                label="Kinh nghiệm"
                value={
                  doctor.experience
                    ? `${doctor.experience} năm`
                    : "Đang cập nhật"
                }
              />
              <InfoBlock
                icon={<DollarOutlined className="text-slate-500! text-lg!" />}
                label="Phí tư vấn"
                value={
                  doctor.consultationFee
                    ? `${doctor.consultationFee.toLocaleString()} VNĐ`
                    : "Liên hệ / Thỏa thuận"
                }
              />
            </div>

            {/* Giấy phép hành nghề */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <IdcardOutlined className="text-slate-400! text-xl! mt-1!" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Giấy phép hành nghề
                  </div>
                  <div className="text-slate-800 text-[15px]">
                    {doctor.licenseNumber || "Chưa cập nhật"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bằng cấp */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <BookOutlined className="text-slate-400! text-xl! mt-1!" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Bằng cấp / Chứng chỉ
                  </div>
                  <QualificationsList qualifications={doctor.qualifications} />
                </div>
              </div>
            </div>

            {/* Mô tả bác sĩ */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <UserOutlined className="text-slate-400! text-xl! mt-1!" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Mô tả bác sĩ
                  </div>
                  <div className="text-slate-800 text-[15px]">
                    {doctor.bio || "Bác sĩ chưa cập nhật tiểu sử chi tiết."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 sm:px-8 py-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
            {/* Nút xem ảnh hoạt động */}
            {doctor.activityImages && doctor.activityImages.length > 0 && (
              <div className="flex justify-center">
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => setGalleryVisible(true)}
                  className="rounded-full! border-blue-200! text-blue-600! hover:text-blue-700! hover:border-blue-300!"
                >
                  Xem ảnh hoạt động ({doctor.activityImages.length})
                </Button>
              </div>
            )}
            <Button
              onClick={onClose}
              className=" h-11! font-semibold! text-slate-600! border-slate-300! hover:border-slate-400! hover:text-slate-800! w-full! sm:w-auto!"
            >
              Đóng
            </Button>
            <Button
              type="primary"
              onClick={() => {
                onClose();
                navigate(`/booking/${doctor._id}`);
              }}
              className="bg-blue-600! hover:bg-blue-700! text-white! border-none! font-bold!  h-11! px-8! w-full! sm:w-auto! shadow-sm! shadow-blue-600/20!"
            >
              Đặt lịch khám ngay
            </Button>
          </div>
        </div>
      </Modal>

      <ActivityGallery
        images={doctor.activityImages}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
      />
    </>
  );
};

export default DoctorDetailModal;
