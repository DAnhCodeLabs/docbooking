import { Outlet } from "react-router-dom";

const CheckinLayout = () => {
  return (
    <div style={{ minHeight: "100vh", width: "100%" }}>
      <Outlet />
    </div>
  );
};

export default CheckinLayout;
