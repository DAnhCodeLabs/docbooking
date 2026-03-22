import { Modal as AntModal } from "antd";

const Modal = ({
  open,
  title,
  onOk,
  onCancel,
  confirmLoading,
  children,
  width = 520,
  ...props
}) => {
  return (
    <AntModal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={width}
      destroyOnClose
      {...props}
    >
      {children}
    </AntModal>
  );
};

export default Modal;
