import { Input } from "antd";
import { useState } from "react";

const Search = ({
  value,
  onSearch,
  placeholder = "Tìm kiếm...",
  loading = false,
}) => {
  const [searchText, setSearchText] = useState(value);

  const handleChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleSearch = () => {
    onSearch(searchText);
  };

  return (
    <Input.Search
      placeholder={placeholder}
      value={searchText}
      onChange={handleChange}
      onSearch={handleSearch}
      allowClear
      loading={loading}
      enterButton
    />
  );
};

export default Search;
