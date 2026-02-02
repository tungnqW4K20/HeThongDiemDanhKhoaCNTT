const bcrypt = require('bcryptjs');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const db = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const { TaiKhoan, GiangVien, sequelize } = db;

const registerGiangVien = async (data) => {
  const { username, password, ma_gv, ho, ten, email, sdt } = data;

  if (!username || !password || !ma_gv) {
    const error = new Error("Cần tối thiểu username, password và mã giảng viên.");
    error.statusCode = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const accountExisted = await TaiKhoan.findOne({ where: { username }, transaction: t });
    if (accountExisted) {
      const error = new Error("Tên đăng nhập này đã được sử dụng.");
      error.statusCode = 409;
      throw error;
    }

    let giangvien = await GiangVien.findOne({ where: { ma_gv }, transaction: t });

    if (giangvien) {
      const hasAccount = await TaiKhoan.findOne({ where: { ref_id: giangvien.giangvien_id }, transaction: t });
      if (hasAccount) {
        const error = new Error("Giảng viên này đã có tài khoản trên hệ thống.");
        error.statusCode = 409;
        throw error;
      }
      console.log("♻️  Liên kết tài khoản mới với Giảng viên hiện hữu...");
    } else {
      console.log("🆕 Tạo hồ sơ Giảng viên mới...");
      giangvien = await GiangVien.create({
        ma_gv, ho, ten, email, sdt
      }, { transaction: t });
    }

    // 3. Hash mật khẩu
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Tạo tài khoản và link với ref_id (ID của Giảng viên cũ hoặc mới đều được)
    const newAccount = await TaiKhoan.create({
      username,
      password_hash,
      vaitro: "giangvien",
      ref_id: giangvien.giangvien_id,
    }, { transaction: t });

    // Trả về dữ liệu sạch
    const result = newAccount.get({ plain: true });
    delete result.password_hash;

    return {
      account: result,
      giangvien: giangvien.get({ plain: true }),
      isNewLecturer: !giangvien.createdAt // Flag để biết là mới tạo hay lừa có sẵn
    };
  });
};


// const loginCustomer = async (loginData) => {
//     const { emailOrUsername, password } = loginData;

//     if (!emailOrUsername || !password) {
//         throw new Error('Vui lòng nhập email/username và mật khẩu.');
//     }

//     const customer = await Customer.findOne({
//         where: {
//             [db.Sequelize.Op.or]: [
//                 { email: emailOrUsername },
//                 { username: emailOrUsername }
//             ]
//         }
//     });

//     if (!customer) {
//         throw new Error('Email/username hoặc mật khẩu không chính xác.');
//     }

//     // So sánh mật khẩu trực tiếp (plaintext so với plaintext trong DB)
//     if (password !== customer.password) {
//         throw new Error('Email/username hoặc mật khẩu không chính xác.');
//     }

//     const payload = {
//         id: customer.id,
//         email: customer.email,
//         username: customer.username,
//         role: "customer"
//     };

//     const token = generateToken(payload, 'customer');
//     const refreshToken = generateRefreshToken(payload, 'customer' )
//     const { password: _, ...customerInfo } = customer.toJSON();
//     const cartCount = await CartItem.sum('quantity', {
//         where: { customer_id: customer.id }
//     });

//     return { token, refreshToken, customer: customerInfo,  cartCount: cartCount || 0 };
// };
const loginTaiKhoan = async ({ username, password }) => {
  const account = await TaiKhoan.findOne({
    where: { username },
    include: [
      {
        model: db.GiangVien,
        as: "GiangVien",
        attributes: ["giangvien_id", "ma_gv", "ho", "ten", "email"]
      }
    ]
  });

  if (!account) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }

  if (account.vaitro !== "giangvien") {
    throw new Error("Tài khoản này không thuộc vai trò giảng viên.");
  }

  const isMatch = await bcrypt.compare(password, account.password_hash);
  if (!isMatch) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }

  const payload = {
    taikhoan_id: account.taikhoan_id,
    role: account.vaitro,
    giangvien_id: account.ref_id 
  };

  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload, 'giangvien');
  const accData = account.toJSON();
  delete accData.password_hash;

  return {
    token,
    refreshToken,
    user: accData,
    giangvien: account.GiangVien,
  };
};



// const loginAdmin = async (loginData) => {
//     const { username, password } = loginData;

//     if (!username || !password) {
//         throw new Error('Vui lòng nhập email/username và mật khẩu.');
//     }
//     console.log("username", username)
//     console.log("password", password)
//     console.log("db", db)
//     console.log("Admin", Admin)

//     const admin = await Admin.findOne({
//         where: {
//             [db.Sequelize.Op.or]: [ { username: username }]
//         }
//     });
//     console.log("admin", admin)
//     if (!admin) {
//         throw new Error('Không tìm thấy admin');
//     }

//     const isPasswordMatch = password === admin.password;

//     if (!isPasswordMatch) {
//         throw new Error('Email/username hoặc mật khẩu không chính xác.');
//     }

//     const payload = {
//         id: admin.id,
//         username: admin.username,
//         role: "admin"
//     };

//     const token = generateToken(payload, 'admin');
//     const refreshToken = generateRefreshToken(payload, 'admin' )

//     const { password: _, ...adminInfo } = admin.toJSON();
//     return { token, refreshToken, admin: adminInfo };
// };

const newRefreshToken = async () => {
    try {
        const decoded = verifyRefreshToken(token);
        const {iat, exp, ...payload} = decoded
        
        const newAccessToken = generateToken(payload, payload.role)
        const newRefreshToken = generateRefreshToken(payload, payload.role)

        return {
            accessToken : newAccessToken,
            refreshToken: newRefreshToken,
            user: payload
        }
    } catch (error) {
        
    }
}

const generateNewTokens = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken)
    const { iat, exp, ...payload } = decoded

    const newAccessToken = generateToken(payload, payload.role)
    const newRefreshToken = generateRefreshToken(payload, payload.role)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: payload
    }
  } catch (error) {
    throw error
  }
}



const loginAdmin = async ({ username, password }) => {
  if (!username || !password) {
    throw new Error('Vui lòng nhập username và mật khẩu.');
  }
  const account = await TaiKhoan.findOne({ where: { username } });
  if (!account) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }
  if (account.vaitro !== 'admin') {
    throw new Error('Tài khoản này không phải là Admin.');
  }

  const isMatch = await bcrypt.compare(password, account.password_hash);
  if (!isMatch) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }

  const payload = {
    id: account.taikhoan_id,      
    username: account.username,
    role: 'admin'                 
  };

  console.log("👉 Payload login admin:", payload); 

  const token = generateToken(payload, 'admin');
  const refreshToken = generateRefreshToken(payload, 'admin');

  const accData = account.toJSON();
  delete accData.password_hash;

  return {
    token,
    refreshToken, 
    user: accData
  };
};


const registerAdmin = async ({ username, password, secretKey }) => {
  // 1. Kiểm tra Secret Key (Mã bí mật để được phép tạo admin)
  // Bạn có thể lưu chuỗi này trong file .env (ví dụ: ADMIN_SECRET=MySuperSecretKey2025)
  const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || "code_bi_mat_123";

  if (secretKey !== ADMIN_CREATION_SECRET) {
    throw new Error("Mã bí mật (secretKey) không đúng. Bạn không có quyền tạo Admin.");
  }

  // 2. Validate
  if (!username || !password) {
    throw new Error("Vui lòng nhập username và password.");
  }

  // 3. Check tồn tại
  const exist = await TaiKhoan.findOne({ where: { username } });
  if (exist) {
    throw new Error("Username đã tồn tại.");
  }

  // 4. Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 5. Tạo Admin
  const newAdmin = await TaiKhoan.create({
    username: username,
    password_hash: password_hash,
    vaitro: 'admin',
    ref_id: null, // Admin hệ thống không cần liên kết giảng viên
    ngay_tao: new Date()
  });

  // 6. Ẩn mật khẩu khi trả về
  const result = newAdmin.toJSON();
  delete result.password_hash;

  return result;
};


module.exports = {
    registerGiangVien,
    // loginCustomer,
    loginAdmin,
    newRefreshToken,
    generateNewTokens,
    loginTaiKhoan,
    registerAdmin
};