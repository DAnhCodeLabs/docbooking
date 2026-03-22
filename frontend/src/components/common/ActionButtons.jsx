import { Space, Button, Popconfirm } from "antd";

const ActionButtons = ({ items, size = "middle" }) => {
  return (
    <Space size={size}>
      {items.map((item) => {
        const {
          key,
          label,
          icon,
          type,
          danger,
          onClick,
          confirm,
          loading,
          disabled,
        } = item;
        const button = (
          <Button
            key={key}
            type={type || "default"}
            danger={danger}
            icon={icon}
            onClick={onClick}
            loading={loading}
            disabled={disabled}
          >
            {label}
          </Button>
        );

        if (confirm) {
          return (
            <Popconfirm
              key={key}
              title={confirm}
              onConfirm={onClick}
              okText="Xác nhận"
              cancelText="Hủy"
            >
              {button}
            </Popconfirm>
          );
        }
        return button;
      })}
    </Space>
  );
};

export default ActionButtons;
