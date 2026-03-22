import UploadFile from "@/components/common/UploadFile";
import { DeleteOutlined, FileOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, message, Modal } from "antd";
import { useState } from "react";
import { doctorApi } from "./doctorApi"; // THÊM IMPORT

const DocumentsTab = ({ documents, onUpdate }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (newFileList) => {
    if (newFileList.length === 0) return;
    const file = newFileList[0].originFileObj;
    setUploading(true);
    try {
      const newDoc = await doctorApi.uploadDocument(file);
      onUpdate([...documents, newDoc]);
      setFileList([]);
      message.success("Tải lên chứng chỉ thành công");
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
      content: "Bạn có chắc chắn muốn xóa tài liệu này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true, className: "rounded-md!" },
      cancelButtonProps: { className: "rounded-md!" },
      onOk: async () => {
        try {
          await doctorApi.deleteDocument(publicId);
          onUpdate(documents.filter((d) => d.publicId !== publicId));
        } catch (error) {
          // MASTER DEV FIX 2: Hiển thị lý do vì sao không được xóa (VD: Bắt buộc giữ 1 tài liệu)
          const errorMessage =
            error?.response?.data?.message || "Không thể xóa tài liệu này.";
          message.error(errorMessage);
        }
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900 m-0">
          Giấy tờ & Chứng chỉ
        </h3>

        <UploadFile
          fileList={fileList}
          onChange={handleUpload}
          maxCount={1} // Giới hạn 1 file mỗi lần
          multiple={false}
          accept=".jpg,.jpeg,.png,.pdf"
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
            Tải lên tài liệu
          </Button>
        </UploadFile>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.publicId}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3 truncate pr-4">
              <FileOutlined className="text-gray-400 text-lg" />
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-medium truncate hover:text-blue-800 transition-colors"
              >
                {doc.name}
              </a>
            </div>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(doc.publicId)}
              className="opacity-60 group-hover:opacity-100 transition-opacity flex! items-center! justify-center!"
            />
          </div>
        ))}
        {documents.length === 0 && (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
            <FileOutlined className="text-gray-300 text-4xl mb-3" />
            <p className="text-gray-500">Chưa có tài liệu nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;
