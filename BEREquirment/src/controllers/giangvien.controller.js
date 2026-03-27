'use strict';

const giangVienService = require('../services/giangvien.service');
const db = require('../models');
const xlsx = require('xlsx');


const getPhanCongTheoHocKy = async (req, res) => {
    try {
        const { giangvien_id } = req.params;
        if (!giangvien_id) {
            return res.status(400).json({ success: false, message: 'Thiếu ID giảng viên trong đường dẫn.' });
        }

        const { hocky_id } = req.query;
        if (!hocky_id) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số bắt buộc: hocky_id' });
        }

        const data = await giangVienService.getPhanCongTheoHocKy(giangvien_id, hocky_id);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách phân công thành công.',
            data: data
        });
    } catch (error) {
        console.error("Get Phan Cong Error:", error.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi lấy danh sách phân công.' });
    }
};

const getLichGiangDay = async (req, res) => {
    try {
        // Lấy giangvien_id từ URL param thay vì req.user
        const { giangvien_id } = req.params;
        if (!giangvien_id) {
            return res.status(400).json({ success: false, message: 'Thiếu ID giảng viên trong đường dẫn.' });
        }

        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số bắt buộc: startDate và endDate' });
        }

        if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
            return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.' });
        }

        const data = await giangVienService.getLichGiangDay(giangvien_id, new Date(startDate), new Date(endDate));

        res.status(200).json({
            success: true,
            message: 'Lấy lịch giảng dạy thành công.',
            data: data
        });

    } catch (error) {
        console.error("Get Lich Giang Day Error:", error.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi lấy lịch giảng dạy.' });
    }
};


const handleGetGiangVienByMaKhoa = async (req, res) => {
    try {
        // Lấy ma_khoa từ query string (?ma_khoa=CNTT)
        let maKhoa = req.query.ma_khoa;
        const { role, chuyennganh_id } = req.user || {};

        if (!maKhoa) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter: ma_khoa'
            });
        }

        let response = await giangVienService.getGiangVienByMaKhoa(
            maKhoa,
            role === 'truongbomon' ? chuyennganh_id : null
        );
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};



const getAllGiangVien = async (req, res) => {
    try {
         const { role, khoa_id, chuyennganh_id } = req.user;
        const targetKhoaId = (role === 'lanhdao' || role === 'truongbomon') ? khoa_id : null;
        const targetChuyenNganhId = role === 'truongbomon' ? chuyennganh_id : null;
        const response = await giangVienService.getAllGiangVienService(targetKhoaId, targetChuyenNganhId);
        return res.status(200).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
}


const handleCreateGiangVien = async (req, res) => {
    try {
        const { ma_gv, ho, ten } = req.body;
        if (!ma_gv || !ho || !ten) {
            return res.status(400).json({ errCode: 1, message: 'Vui lòng nhập đủ: Mã GV, Họ, Tên' });
        }
        const message = await giangVienService.createGiangVien(req.body);
        return res.status(200).json(message);
    } catch (e) {
        return res.status(500).json({ errCode: -1, message: 'Error from server' });
    }
};

const handleGetGiangVienById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ errCode: 1, message: 'Missing ID' });
        
        const response = await giangVienService.getGiangVienById(id);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(500).json({ errCode: -1, message: 'Error from server' });
    }
};

const handleUpdateGiangVien = async (req, res) => {
    try {
        const data = req.body;
        // Nếu client gửi id qua URL params thì gán vào body
        if(req.params.id) data.giangvien_id = req.params.id;

        const message = await giangVienService.updateGiangVien(data);
        return res.status(200).json(message);
    } catch (e) {
        return res.status(500).json({ errCode: -1, message: 'Error from server' });
    }
};

const handleDeleteGiangVien = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID từ URL params
        if (!id) return res.status(400).json({ errCode: 1, message: 'Missing ID' });

        const message = await giangVienService.deleteGiangVien(id);
        return res.status(200).json(message);
    } catch (e) {
        return res.status(500).json({ errCode: -1, message: 'Error from server' });
    }
};



const getProfile = async (req, res) => {
  try {
     console.log("Payload từ Token:", req.user); // <--- XEM DÒNG NÀY Ở TERMINAL

    // CHUYÊN GIA: Lấy ID trực tiếp từ token đã giải mã ở middleware authenticateToken
    // req.user chứa payload của JWT
    const id = req.user.giangvien_id; 
    console.log("ID lấy được:", id)

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Token không chứa thông tin định danh giảng viên hợp lệ"
      });
    }

    const data = await giangVienService.getThongTinGiangVien(id);

    // Format dữ liệu cho khớp với UI
    const formattedData = {
      giangvien_id: data.giangvien_id,
      ho_ten: `${data.ho} ${data.ten}`, 
      ma_gv: data.ma_gv,
      email: data.email,
      sdt: data.sdt,
      don_vi_cong_tac: data.Khoa ? data.Khoa.ten_khoa : 'Chưa cập nhật',
    };

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin profile thành công",
      data: formattedData
    });

  } catch (error) {
    console.error("Lỗi getProfile:", error);
    return res.status(error.message === 'Không tìm thấy giảng viên' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};


const toNonAccent = (str) => {
    if (!str) return '';
    str = str.toString().trim();
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D");
};

const normalize = (str) => {
    if (!str) return '';
    return toNonAccent(str).toLowerCase().replace(/[^a-z0-9]/g, "");
};

const findValueInRow = (row, keywords) => {
    if (!row || typeof row !== 'object') return undefined;
    const keys = Object.keys(row);
    for (const kw of keywords) {
        const cleanKw = normalize(kw); 
        const foundKey = keys.find(k => normalize(k).includes(cleanKw));
        if (foundKey) return row[foundKey];
    }
    return undefined;
};

// ==========================================
// 2. LOGIC IMPORT GIẢNG VIÊN
// ==========================================

const importGiangVienExcel = async (req, res) => {
    // Dynamic import UUID
    const { v4: uuidv4 } = await import('uuid');
    const transaction = await db.sequelize.transaction();
    
    try {
        // 1. Kiểm tra file
        if (!req.file) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Vui lòng upload file excel.' });
        }

        // 2. Đọc file
        let workbook;
        try {
            workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        } catch (e) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Lỗi đọc file.' });
        }

        const sheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawData.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'File Excel rỗng.' });
        }

        // 3. Load dữ liệu tham chiếu
        // Lấy tất cả Khoa để map (Mã Khoa -> ID)
        const allKhoa = await db.Khoa.findAll({ attributes: ['khoa_id', 'ma_khoa', 'ten_khoa'] });
        
        // Lấy tất cả Giảng viên để check trùng (Mã GV & Email)
        const existingGVs = await db.GiangVien.findAll({ attributes: ['ma_gv', 'email'] });
        
        // Tạo Set để check nhanh
        const existingCodes = new Set(existingGVs.map(g => normalize(g.ma_gv)));
        const existingEmails = new Set(existingGVs.map(g => normalize(g.email))); // Optional: Check trùng email

        const listToInsert = [];
        let duplicateCount = 0;
        let successCount = 0;

        // 4. Duyệt từng dòng
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            // Map cột linh hoạt
            const maGVVal = findValueInRow(row, ['magv', 'ma_gv', 'code']);
            const hoVal = findValueInRow(row, ['ho', 'lastname']);
            const tenVal = findValueInRow(row, ['ten', 'firstname', 'name']);
            const emailVal = findValueInRow(row, ['email', 'mail']);
            const sdtVal = findValueInRow(row, ['sdt', 'phone', 'dienthoai']);
            const maKhoaVal = findValueInRow(row, ['makhoa', 'ma_khoa', 'khoa']);

            // Validate bắt buộc: Mã GV, Họ, Tên
            if (!maGVVal || !hoVal || !tenVal) {
                continue; 
            }

            const cleanMaGV = maGVVal.toString().trim();
            const cleanMaGVCheck = normalize(cleanMaGV);
            const cleanEmail = emailVal ? emailVal.toString().trim() : '';

            // Check trùng Mã GV
            if (existingCodes.has(cleanMaGVCheck)) {
                duplicateCount++;
                continue; 
            }
            
            // (Optional) Check trùng Email nếu có email và muốn duy nhất
            if (cleanEmail && existingEmails.has(normalize(cleanEmail))) {
                duplicateCount++;
                continue;
            }

            // Xử lý tìm Khoa ID dựa trên Mã Khoa (VD: "CNTT")
            let khoaId = null;
            if (maKhoaVal) {
                const searchKey = normalize(maKhoaVal);
                // Tìm khoa khớp Mã Khoa (ưu tiên) hoặc Tên Khoa
                const foundKhoa = allKhoa.find(k => 
                    normalize(k.ma_khoa) === searchKey || 
                    normalize(k.ten_khoa) === searchKey
                );
                if (foundKhoa) khoaId = foundKhoa.khoa_id;
            }

            // Chuẩn bị data insert
            listToInsert.push({
                giangvien_id: uuidv4(),
                ma_gv: cleanMaGV,
                ho: hoVal.toString().trim(),
                ten: tenVal.toString().trim(),
                email: cleanEmail,
                sdt: sdtVal ? sdtVal.toString().trim() : null,
                khoa_id: khoaId,
                ngay_tao: new Date(),
                isDeleted: false
            });

            // Add vào Set để tránh trùng lặp ngay trong file
            existingCodes.add(cleanMaGVCheck);
            if (cleanEmail) existingEmails.add(normalize(cleanEmail));
            successCount++;
        }

        // 5. Insert vào DB
        if (listToInsert.length > 0) {
            await db.GiangVien.bulkCreate(listToInsert, { transaction });
            
            // 🔥 (Tùy chọn) Tự động tạo Tài khoản cho Giảng viên mới import
            // const taiKhoanList = listToInsert.map(gv => ({
            //     taikhoan_id: uuidv4(),
            //     username: gv.ma_gv, // Username là Mã GV
            //     password_hash: '...', // Hash của mật khẩu mặc định (vd: 123456)
            //     vaitro: 'giangvien',
            //     ref_id: gv.giangvien_id
            // }));
            // await db.TaiKhoan.bulkCreate(taiKhoanList, { transaction });
        }

        await transaction.commit();

        return res.status(200).json({
            success: true,
            message: `Import thành công.`,
            data: {
                total_rows: rawData.length,
                inserted: successCount,
                duplicates_skipped: duplicateCount
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi Import GiangVien:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi import: ' + error.message 
        });
    }
};



module.exports = {
    getPhanCongTheoHocKy,
    getLichGiangDay,
    handleGetGiangVienByMaKhoa,
    getAllGiangVien,
    handleCreateGiangVien,
    handleGetGiangVienById,
    handleUpdateGiangVien,
    handleDeleteGiangVien,
    getProfile,
    importGiangVienExcel
};