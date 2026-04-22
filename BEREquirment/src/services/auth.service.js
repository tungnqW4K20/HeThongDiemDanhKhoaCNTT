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
  const account = await TaiKhoan.findOne({ 
    where: { username },
    include: [{
      model: db.GiangVien,
      as: 'GiangVien', // Alias này phải khớp với model TaiKhoan đã định nghĩa
      attributes: ['khoa_id']
    }]
  });
  if (!account) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }
  if (!['admin', 'lanhdao', 'truongbomon'].includes(account.vaitro)) {
    throw new Error('Tài khoản này không có quyền đăng nhập vào hệ thống quản trị.');
  }

  const isMatch = await bcrypt.compare(password, account.password_hash);
  if (!isMatch) {
    throw new Error('Username hoặc mật khẩu không chính xác.');
  }

  let truongBoMon = null;
  if (account.vaitro === 'truongbomon') {
    const boMonPhuTrach = await db.BoMon.findOne({
      where: {
        truong_bomon_id: account.taikhoan_id,
        isDeleted: false
      },
      attributes: ['bomon_id', 'khoa_id']
    });

    if (boMonPhuTrach) {
      truongBoMon = {
        chuyennganh_id: boMonPhuTrach.bomon_id,
        khoa_id: boMonPhuTrach.khoa_id
      };
    } else {
      const lopPhuTrach = await db.LopHanhChinh.findOne({
        where: {
          giangvien_id: account.ref_id,
          chuyennganh_id: { [db.Sequelize.Op.ne]: null }
        },
        attributes: ['chuyennganh_id', 'khoa_id']
      });

      if (!lopPhuTrach) {
        const lopHocPhan = await db.LopHocPhan.findOne({
          where: { giangvien_id: account.ref_id },
          include: [{
            model: db.MonHoc,
            required: true,
            attributes: ['bomon_id', 'khoa_id'],
            where: { bomon_id: { [db.Sequelize.Op.ne]: null } }
          }],
          attributes: ['lophocphan_id']
        });

        if (lopHocPhan?.MonHoc?.bomon_id) {
          truongBoMon = {
            chuyennganh_id: lopHocPhan.MonHoc.bomon_id,
            khoa_id: lopHocPhan.MonHoc.khoa_id
          };
        }
      }

      if (lopPhuTrach && !truongBoMon) {
      truongBoMon = {
        chuyennganh_id: lopPhuTrach.chuyennganh_id,
        khoa_id: lopPhuTrach.khoa_id
      };
      }
    }
  }

  if (account.vaitro === 'truongbomon' && !truongBoMon) {
    throw new Error('Tài khoản trưởng bộ môn chưa được gán bộ môn (chuyên ngành).');
  }

  const payload = {
    id: account.taikhoan_id,      
    username: account.username,
    role: account.vaitro,
    khoa_id:
      account.vaitro === 'lanhdao'
        ? account.GiangVien?.khoa_id
        : account.vaitro === 'truongbomon'
          ? (truongBoMon?.khoa_id || null)
          : null,
    chuyennganh_id: account.vaitro === 'truongbomon' ? (truongBoMon?.chuyennganh_id || null) : null
  };

  console.log("👉 Payload login admin:", payload); 

  const token = generateToken(payload, account.vaitro);
  const refreshToken = generateRefreshToken(payload, account.vaitro);

  const accData = account.toJSON();
  delete accData.password_hash;

  return {
    token,
    refreshToken, 
    user: accData
  };
};


const registerAdmin = async ({ username, password, secretKey, vaitro = 'admin' }) => {
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

  // Validate vaitro
  if (!['admin', 'lanhdao', 'truongbomon'].includes(vaitro)) {
    throw new Error("Vai trò không hợp lệ. Chỉ chấp nhận 'admin', 'lanhdao' hoặc 'truongbomon'.");
  }

  // 5. Tạo Admin/Lãnh đạo
  const newAdmin = await TaiKhoan.create({
    username: username,
    password_hash: password_hash,
    vaitro: vaitro,
    ref_id: null,
    ngay_tao: new Date()
  });

  // 6. Ẩn mật khẩu khi trả về
  const result = newAdmin.toJSON();
  delete result.password_hash;

  return result;
};


// Admin cập nhật tài khoản giảng viên (đổi username và/hoặc mật khẩu)
const adminUpdateAccountGV = async ({ taikhoan_id, username, new_password }) => {
  if (!taikhoan_id) {
    const error = new Error('Thiếu taikhoan_id.');
    error.statusCode = 400;
    throw error;
  }

  const account = await TaiKhoan.findOne({
    where: {
      taikhoan_id,
      vaitro: { [db.Sequelize.Op.in]: ['giangvien', 'truongbomon'] }
    }
  });
  if (!account) {
    const error = new Error('Không tìm thấy tài khoản giảng viên.');
    error.statusCode = 404;
    throw error;
  }

  const updates = {};

  if (username && username !== account.username) {
    const existed = await TaiKhoan.findOne({ where: { username } });
    if (existed) {
      const error = new Error('Tên đăng nhập này đã được sử dụng.');
      error.statusCode = 409;
      throw error;
    }
    updates.username = username;
  }

  if (new_password && new_password.length >= 6) {
    updates.password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
  }

  if (Object.keys(updates).length === 0) {
    const error = new Error('Không có thông tin nào được thay đổi.');
    error.statusCode = 400;
    throw error;
  }

  await account.update(updates);

  const result = account.toJSON();
  delete result.password_hash;
  return result;
};

const changePassword = async ({ taikhoan_id, current_password, new_password }) => {
  if (!taikhoan_id) {
    const error = new Error('Thiếu thông tin tài khoản.');
    error.statusCode = 400;
    throw error;
  }

  if (!current_password || !new_password) {
    const error = new Error('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
    error.statusCode = 400;
    throw error;
  }

  if (new_password.length < 6) {
    const error = new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    error.statusCode = 400;
    throw error;
  }

  const account = await TaiKhoan.findByPk(taikhoan_id);
  if (!account) {
    const error = new Error('Không tìm thấy tài khoản.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(current_password, account.password_hash);
  if (!isMatch) {
    const error = new Error('Mật khẩu hiện tại không chính xác.');
    error.statusCode = 400;
    throw error;
  }

  const isSamePassword = await bcrypt.compare(new_password, account.password_hash);
  if (isSamePassword) {
    const error = new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
    error.statusCode = 400;
    throw error;
  }

  const newHashed = await bcrypt.hash(new_password, SALT_ROUNDS);
  await account.update({ password_hash: newHashed });

  return { taikhoan_id: account.taikhoan_id, username: account.username };
};

module.exports = {
    registerGiangVien,
    // loginCustomer,
    loginAdmin,
    newRefreshToken,
    generateNewTokens,
    loginTaiKhoan,
    registerAdmin,
    adminUpdateAccountGV,
    changePassword
};
