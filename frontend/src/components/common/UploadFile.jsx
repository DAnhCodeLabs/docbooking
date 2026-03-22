import { Upload } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const UploadFile = ({
  fileList,
  onChange,
  maxCount = 1,
  listType = "picture-card",
  accept = "image/*",
  multiple = false,
  children,
  ...rest
}) => {
  const dummyRequest = ({ file, onSuccess }) => {
    setTimeout(() => {
      onSuccess("ok");
    }, 0);
  };

  const handleChange = ({ fileList: newFileList }) => {
    onChange(newFileList);
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  return (
    <Upload
      customRequest={dummyRequest}
      fileList={fileList}
      onChange={handleChange}
      listType={listType}
      accept={accept}
      multiple={multiple}
      maxCount={maxCount}
      {...rest}
    >
      {fileList.length < maxCount ? children || uploadButton : null}
    </Upload>
  );
};

export default UploadFile;
