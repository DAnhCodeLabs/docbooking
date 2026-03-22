import { Spin } from "antd";

const Loading = ({
  spinning = true,
  tip = "Đang tải...",
  size = "default",
  fullscreen = false,
}) => {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <Spin size="" tip={tip} />
      </div>
    );
  }
  return <Spin spinning={spinning} tip={tip} size={size} />;
};

export default Loading;
