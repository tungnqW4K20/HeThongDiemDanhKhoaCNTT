const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const result = await authService.registerGiangVien(req.body);

    return res.status(201).json({
      success: true,
      message: result.isNewLecturer 
        ? "Đã tạo mới hồ sơ và tài khoản giảng viên." 
        : "Đã tạo tài khoản cho giảng viên hiện hữu trên hệ thống.",
      data: result
    });

  } catch (error) {
    console.error("❌ Register Error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi server trong quá trình đăng ký."
    });
  }
};
// const login = async (req, res, next) => {
//     try {
//         const { emailOrUsername, password } = req.body;
//          if (!emailOrUsername || !password) {
//              return res.status(400).json({
//                  success: false,
//                  message: 'Vui lòng nhập email/username và mật khẩu.'
//              });
//         }

//         const loginData = { emailOrUsername, password };
//         const result = await authService.loginCustomer(loginData);
//         // const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//         // await delay(5000);

//         res.status(200).json({
//             success: true,
//             message: 'Đăng nhập thành công!',
//             data: result // Chứa token và customer info
//         });
//     } catch (error) {
//          console.error("Login Error:", error.message);
//         if (error.message.includes('không chính xác')) {
//             return res.status(401).json({ success: false, message: error.message }); // 401 Unauthorized
//         }
//          if (error.message.includes('Vui lòng nhập')) {
//              return res.status(400).json({ success: false, message: error.message }); // 400 Bad Request
//         }
//         res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi đăng nhập.' });
//         // next(error);
//     }
// };
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập username và mật khẩu.'
      });
    }

    const result = await authService.loginTaiKhoan({ username, password });

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: result
    });

  } catch (error) {
    console.error("Login Error:", error.message);

    if (error.message.includes('không chính xác')) {
      return res.status(401).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ khi đăng nhập.'
    });
  }
};

const loginAdmin = async (req, res, next) => {
    try {
        const { username, password } = req.body;
         if (!username || !password) {
             return res.status(400).json({
                 success: false,
                 message: 'Vui lòng nhập email/username và mật khẩu.'
             });
        }

        const loginData = { 
            username, 
            password 
        };
        const result = await authService.loginAdmin(loginData);

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: result // Chứa token và customer info
        });
    } catch (error) {
         console.error("Login Error:", error.message);
        if (error.message.includes('không chính xác')) {
            return res.status(401).json({ success: false, message: error.message }); // 401 Unauthorized
        }
         if (error.message.includes('Vui lòng nhập')) {
             return res.status(400).json({ success: false, message: error.message }); // 400 Bad Request
        }
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi đăng nhập.' });
        // next(error);
    }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Missing refresh token" })
    }

    const result = await authService.generateNewTokens(refreshToken)

    return res.status(200).json({
      success: true,
      message: 'Refresh token thành công!',
      data: result // Chứa accessToken + refreshToken mới + user
    })
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token failed', error: error.message })
  }
}


const createAdmin = async (req, res) => {
  try {
    const { username, password, secretKey, vaitro } = req.body;

    // Gọi service
    const result = await authService.registerAdmin({ username, password, secretKey, vaitro });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản Admin thành công!",
      data: result
    });

  } catch (error) {
    console.error("Create Admin Error:", error.message);
    
    // Xử lý các lỗi cụ thể
    if (error.message.includes("Mã bí mật")) {
        return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes("tồn tại")) {
        return res.status(409).json({ success: false, message: error.message });
    }

    return res.status(500).json({ 
        success: false, 
        message: "Lỗi server: " + error.message 
    });
  }
};


// Admin tạo tài khoản cho giảng viên
const adminTaoTaiKhoanGV = async (req, res) => {
  try {
    const result = await authService.registerGiangVien(req.body);
    return res.status(201).json({
      success: true,
      message: result.isNewLecturer
        ? 'Đã tạo mới hồ sơ và tài khoản giảng viên.'
        : 'Đã tạo tài khoản cho giảng viên hiện hữu.',
      data: result
    });
  } catch (error) {
    console.error('adminTaoTaiKhoanGV Error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi server'
    });
  }
};

// Admin cập nhật tài khoản giảng viên
const adminUpdateAccountGV = async (req, res) => {
  try {
    const { taikhoan_id } = req.params;
    const result = await authService.adminUpdateAccountGV({ taikhoan_id, ...req.body });
    return res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản thành công.',
      data: result
    });
  } catch (error) {
    console.error('adminUpdateAccountGV Error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi server'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const taikhoan_id = req.user?.id || req.user?.taikhoan_id;

    const result = await authService.changePassword({
      taikhoan_id,
      current_password,
      new_password
    });

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
      data: result
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi server'
    });
  }
};

module.exports = {
    register,
    login,
    loginAdmin,
    refreshToken,
    createAdmin,
    adminTaoTaiKhoanGV,
    adminUpdateAccountGV,
    changePassword
};
