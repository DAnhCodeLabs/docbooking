import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Outlet } from "react-router-dom";

const PatientLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 w-full pt-38 md:pt-42 flex flex-col">
        <div className="w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PatientLayout;
