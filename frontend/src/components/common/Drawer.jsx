import { Drawer as AntDrawer } from "antd";

const Drawer = ({
  open,
  title,
  onClose,
  placement = "right",
  width = 500,
  children,
  footer,
  ...props
}) => {
  return (
    <AntDrawer
      open={open}
      title={title}
      onClose={onClose}
      placement={placement}
      width={width}
      footer={footer}
      destroyOnClose
      {...props}
    >
      {children}
    </AntDrawer>
  );
};

export default Drawer;
