import { Empty, Button } from "antd";

const EmptyState = ({ description = "Không có dữ liệu", image, action }) => {
  return (
    <Empty description={description} image={image} style={{ margin: "40px 0" }}>
      {action && <Button type="primary">{action}</Button>}
    </Empty>
  );
};

export default EmptyState;
