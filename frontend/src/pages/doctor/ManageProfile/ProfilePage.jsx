import {
  PictureOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Spin, Tabs, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import ActivityImagesTab from "./ActivityImagesTab";
import DocumentsTab from "./DocumentsTab";
import InfoTab from "./InfoTab";
import QualificationsTab from "./QualificationsTab";
import { doctorApi } from "./doctorApi"; // THÊM IMPORT

const { Title, Text } = Typography;

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await doctorApi.getMyProfile();
      setProfile(data);
    } catch (error) {
      message.error("Không thể tải thông tin hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileUpdate = (updatedData) => {
    setProfile((prev) => ({ ...prev, ...updatedData }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không có dữ liệu hồ sơ</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header hồ sơ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <div className="w-30 h-30 sm:w-30 sm:h-30 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {profile.user?.avatar ? (
              <img
                src={profile.user.avatar}
                alt="avatar"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <UserOutlined className="text-6xl sm:text-7xl text-gray-400" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <Title level={2} className="mb-2! text-gray-900! font-semibold!">
              BS. {profile.user?.fullName}
            </Title>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
              <Tag
                color="blue"
                className="rounded-full! border-none! px-4! py-1! text-sm! font-medium! bg-blue-50! text-blue-700!"
              >
                {profile.specialty?.name}
              </Tag>
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-1 rounded-full border border-green-100 text-sm font-medium">
                <SafetyCertificateOutlined />
                <span>Đã xác minh</span>
              </div>
            </div>
            <Text className="text-gray-600! text-base! block max-w-3xl mx-auto md:mx-0">
              {profile.bio || "Chưa cập nhật giới thiệu bản thân."}
            </Text>
          </div>
        </div>

        {/* Tabs nội dung */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Tabs
            defaultActiveKey="1"
            size="large"
            className="px-6! pt-2!"
            items={[
              {
                key: "1",
                label: (
                  <span className="font-medium!">
                    <UserOutlined /> Thông tin chung
                  </span>
                ),
                children: (
                  <div className="py-4">
                    <InfoTab profile={profile} onRefresh={fetchProfile} />
                  </div>
                ),
              },
              {
                key: "2",
                label: (
                  <span className="font-medium!">
                    <SafetyCertificateOutlined /> Bằng cấp
                  </span>
                ),
                children: (
                  <div className="py-4">
                    <QualificationsTab
                      qualifications={profile.qualifications}
                    />
                  </div>
                ),
              },
              {
                key: "3",
                label: (
                  <span className="font-medium!">
                    <SettingOutlined /> Giấy tờ & Chứng chỉ
                  </span>
                ),
                children: (
                  <div className="py-4">
                    <DocumentsTab
                      documents={profile.documents || []}
                      onUpdate={(newDocs) =>
                        handleProfileUpdate({ documents: newDocs })
                      }
                    />
                  </div>
                ),
              },
              {
                key: "4",
                label: (
                  <span className="font-medium!">
                    <PictureOutlined /> Ảnh hoạt động
                  </span>
                ),
                children: (
                  <div className="py-4">
                    <ActivityImagesTab
                      images={profile.activityImages || []}
                      onUpdate={(newImages) =>
                        handleProfileUpdate({ activityImages: newImages })
                      }
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
