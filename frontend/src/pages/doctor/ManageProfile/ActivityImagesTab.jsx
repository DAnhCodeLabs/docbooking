import UploadFile from "@/components/common/UploadFile";
import {
  DeleteOutlined,
  PictureOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, message, Modal } from "antd";
import { useState } from "react";
import { doctorApi } from "./doctorApi"; // THÊM IMPORT

const ActivityImagesTab = ({ images, onUpdate }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (newFileList) => {
    if (newFileList.length === 0) return;
    const file = newFileList[0].originFileObj;
    setUploading(true);
    try {
      const newImage = await doctorApi.uploadActivityImage(file);
      onUpdate([...images, newImage]);
      setFileList([]);
      message.success("Tải lên ảnh hoạt động thành công");
    } catch (error) {
      // ✅ Xử lý từ axiosClient interceptor đã transform
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        "Tải lên thất bại. Vui lòng thử lại.";
      message.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (publicId) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa ảnh này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true, className: "rounded-md!" },
      cancelButtonProps: { className: "rounded-md!" },
      onOk: async () => {
        try {
          await doctorApi.deleteActivityImage(publicId);
          onUpdate(images.filter((img) => img.publicId !== publicId));
        } catch (error) {
          // MASTER DEV FIX 3
          const errorMessage =
            error?.response?.data?.message || "Không thể xóa ảnh này.";
          message.error(errorMessage);
        }
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900 m-0">
          Ảnh hoạt động thực tế
        </h3>

        <UploadFile
          fileList={fileList}
          onChange={handleUpload}
          maxCount={5}
          multiple={true}
          accept="image/*"
          listType="text"
          showUploadList={false}
        >
          <Button
            type="default"
            icon={<PlusOutlined />}
            loading={uploading}
            disabled={uploading}
            className="font-medium! border-gray-300! text-gray-700! hover:border-gray-400! rounded-md!"
          >
            Tải lên ảnh mới
          </Button>
        </UploadFile>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div
              key={img.publicId}
              className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100"
            >
              <img
                src={img.url}
                alt="activity"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(img.publicId)}
                  className="bg-red-500! hover:bg-red-600! border-none! shadow-md! rounded-md!"
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <PictureOutlined className="text-gray-300 text-4xl mb-3" />
          <p className="text-gray-500">Chưa có ảnh hoạt động nào</p>
        </div>
      )}
    </div>
  );
};

export default ActivityImagesTab;
