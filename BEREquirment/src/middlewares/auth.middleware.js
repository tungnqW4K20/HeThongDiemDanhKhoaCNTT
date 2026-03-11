const { verifyToken } = require('../utils/jwt.utils');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Truy cập bị từ chối. Không tìm thấy token.'
        });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
       // có thể check role trong token rồi đi xuống bảng tương ứng trong csdl để check user có tồn tại ko
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
            });
        }
        if (error.name === 'JsonWebTokenError' || error.message.includes('invalid token')) {
            return res.status(403).json({
                success: false,
                message: 'Token không hợp lệ.'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Xác thực token thất bại.'
        });
    }
};

const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ 
                success: false,
                message: 'Không có quyền truy cập. Thông tin vai trò người dùng bị thiếu.'
            });
        }

        const userRole = req.user.role;
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (rolesArray.includes(userRole)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: `Truy cập bị từ chối. Bạn không có quyền ${rolesArray.join(' hoặc ')} để thực hiện hành động này.`
            });
        }
    };
};





module.exports = {
    authenticateToken,
    authorizeRole
};

