import bcrypt from "bcryptjs";

// Mật khẩu bạn muốn mã hóa
const password = "Anh123";

// Số vòng lặp mã hóa (phải khớp với logic trong User.js)
const saltRounds = 12;

async function generateHash() {
  try {
    console.log("Đang tiến hành mã hóa...");

    // Tạo mã hash
    const hash = await bcrypt.hash(password, saltRounds);

    console.log("------------------------------------------");
    console.log("Mật khẩu gốc: ", password);
    console.log("Mã hash của bạn: ", hash);
    console.log("------------------------------------------");
    console.log(
      "Hãy copy đoạn mã trên và thay vào trường 'password' trong file JSON của bạn.",
    );
  } catch (err) {
    console.error("Có lỗi xảy ra:", err.message);
  }
}

generateHash();
