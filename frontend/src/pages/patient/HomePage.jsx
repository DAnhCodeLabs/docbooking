import FeaturedDoctors from "@/components/FeaturedDoctors";
import Banner from "./Banner";
import CategoryGrid from "./CategoryGrid";

function HomePage() {
  return (
    <>
      <Banner />
      <CategoryGrid />
      <FeaturedDoctors />
    </>
  );
}

export default HomePage;
