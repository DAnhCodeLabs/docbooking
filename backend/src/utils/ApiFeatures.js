/**
 * ApiFeatures – Xử lý các tính năng truy vấn động cho Mongoose
 * @param {Object} query - Mongoose Query (ví dụ: Model.find())
 * @param {Object} queryString - req.query (object từ URL)
 */
class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Tìm kiếm theo field với regex (không phân biệt hoa thường)
   * Query mẫu: ?search=john&searchBy=name,email
   * Nếu không có searchBy, mặc định tìm theo field 'name'
   */
  /**
   * Tìm kiếm toàn văn bản (Full-text search) sử dụng MongoDB Text Index
   * Query mẫu: ?search=john
   * Lưu ý: Collection bắt buộc phải được đánh index dạng "text" trước đó.
   */
  search() {
    const { search } = this.queryString;

    if (search) {
      // Sử dụng $text thay cho $regex để tận dụng Text Index (chuẩn performance)
      this.query = this.query.find({
        $text: { $search: search },
      });
    }

    return this;
  }

  /**
   * Lọc dữ liệu: hỗ trợ các toán tử so sánh (gte, gt, lte, lt)
   * Loại bỏ các trường đặc biệt (page, limit, sort, fields, search, searchBy)
   * Tự động thêm tiền tố '$' vào toán tử
   */
  // Phương thức private xây dựng filter object
  _buildFilter() {
    const queryObj = { ...this.queryString };
    const excludeFields = [
      "page",
      "limit",
      "sort",
      "fields",
      "search",
      "searchBy",
    ];
    excludeFields.forEach((field) => delete queryObj[field]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    return JSON.parse(queryStr);
  }

  filter() {
    const filterObj = this._buildFilter();
    this.query = this.query.find(filterObj);
    return this;
  }

  async countTotal(model) {
    // Lấy filter từ query hiện tại (đã qua search và filter)
    const finalFilter = this.query.getFilter();
    return await model.countDocuments(finalFilter);
  }
  /**
   * Sắp xếp kết quả
   * Query mẫu: ?sort=-createdAt,price (giảm dần theo createdAt, tăng dần theo price)
   * Mặc định: sắp xếp theo -createdAt (mới nhất trước)
   */
  sort() {
    if (this.queryString.sort) {
      // Chuyển dấu phẩy thành khoảng trắng (Mongoose sort syntax)
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      // Mặc định: mới nhất trước
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  /**
   * Giới hạn các trường trả về
   * Query mẫu: ?fields=name,email,role
   * Mặc định: loại bỏ trường __v (version key)
   */
  limitFields() {
    if (this.queryString.fields) {
      // Chuyển dấu phẩy thành khoảng trắng (Mongoose select syntax)
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      // Mặc định ẩn __v
      this.query = this.query.select("-__v");
    }
    return this;
  }

  /**
   * Phân trang
   * Query mẫu: ?page=2&limit=20
   * Mặc định: page=1, limit=10
   */
  paginate() {
    // Ép kiểu số, nếu NaN thì dùng giá trị mặc định
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

export default ApiFeatures;
