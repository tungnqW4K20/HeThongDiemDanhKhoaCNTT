'use strict';
const db = require('../models');
const xlsx = require('xlsx');
const { Op } = require('sequelize');

const lopService = require('../services/lop.service');

const getAll = async (req, res, next) => {
    try {
        const { khoa_id } = req.query;
        const data = await lopService.getAllLop(khoa_id);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách lớp học thành công.',
            data: data
        });
    } catch (error) {
        console.error("Get All Lop Error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi lấy danh sách lớp học.'
        });
    }
};

const getStudentsByClass = async (req, res, next) => {
    try {
        const { lop_id } = req.params;
        if (!lop_id) {
            return res.status(400).json({ success: false, message: 'Thiếu ID của lớp trong đường dẫn.' });
        }

        const lop = await db.Lop.findByPk(lop_id);
        if (!lop) {
            return res.status(404).json({ success: false, message: `Không tìm thấy lớp học với ID ${lop_id}.` });
        }

        const data = await lopService.getStudentsByClassId(lop_id);
        
        
        res.status(200).json({
            success: true,
            message: `Lấy danh sách sinh viên của lớp '${lop.ten_lop}' thành công.`,
            data: data
        });
    } catch (error) {
        console.error("Get Students By Class ID Error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi lấy danh sách sinh viên.'
        });
    }
};



// const createLop = async (req, res) => {
//   try {
//     const { ten_lop, nien_khoa, chuong_trinh, khoa_id, giangvien_id, ghichu,  } = req.body;

//     if (!ten_lop || !nien_khoa || !chuong_trinh) {
//       return res.status(400).json({
//         success: false,
//         message: 'ten_lop, nien_khoa và chuong_trinh là bắt buộc'
//       });
//     }

//     const newLop = await lopService.createLop({ ten_lop, nien_khoa, chuong_trinh, khoa_id, giangvien_id, ghichu });

//     return res.status(201).json({
//       success: true,
//       message: 'Tạo lớp thành công',
//       data: newLop
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
const createLop = async (req, res) => {
  try {
    // Thêm chuyennganh_id và coso_id (nếu cần) vào destructuring
    const { ten_lop, nien_khoa, chuong_trinh, khoa_id, giangvien_id, ghichu, chuyennganh_id, coso_id } = req.body;

    if (!ten_lop || !nien_khoa || !chuong_trinh) {
      return res.status(400).json({
        success: false,
        message: 'ten_lop, nien_khoa và chuong_trinh là bắt buộc'
      });
    }

    const newLop = await lopService.createLop({ 
      ten_lop, nien_khoa, chuong_trinh, khoa_id, giangvien_id, ghichu, chuyennganh_id, coso_id 
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo lớp thành công',
      data: newLop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateLop = async (req, res) => {
    try {
        const { lop_id } = req.params;
        const {
            ten_lop,
            nien_khoa,
            chuong_trinh,
            khoa_id,
            giangvien_id,
            ghichu,
            chuyennganh_id,
            coso_id
        } = req.body;

        if (!lop_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID lớp cần cập nhật.'
            });
        }

        if (ten_lop !== undefined && !ten_lop) {
            return res.status(400).json({
                success: false,
                message: 'ten_lop không được để trống.'
            });
        }

        const updated = await lopService.updateLop(lop_id, {
            ten_lop,
            nien_khoa,
            chuong_trinh,
            khoa_id,
            giangvien_id,
            ghichu,
            chuyennganh_id,
            coso_id
        });

        return res.status(200).json({
            success: true,
            message: 'Cập nhật lớp hành chính thành công.',
            data: updated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// const importClasses = async (req, res) => {
//     const t = await db.sequelize.transaction(); // Bắt đầu Transaction
//     try {
//         if (!req.file) {
//             await t.rollback();
//             return res.status(400).json({ success: false, message: 'Vui lòng upload file excel.' });
//         }

//         // 1. Đọc file Excel từ buffer
//         const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];

//         // --- TÌM DÒNG HEADER ---
//         // Đọc dưới dạng mảng 2 chiều để tìm dòng chứa "MÃ LỚP"
//         const rawMatrix = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

//         let headerRowIndex = -1;
//         for (let i = 0; i < rawMatrix.length; i++) {
//             const row = rawMatrix[i];
//             const isHeader = row.some(cell => 
//                 cell && cell.toString().trim().toUpperCase().includes('MÃ LỚP')
//             );
            
//             if (isHeader) {
//                 headerRowIndex = i;
//                 break;
//             }
//         }

//         if (headerRowIndex === -1) {
//             await t.rollback();
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'Không tìm thấy cột "MÃ LỚP". Vui lòng kiểm tra lại file mẫu.' 
//             });
//         }

//         // Đọc dữ liệu từ dòng header tìm được
//         const rawData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

//         if (!rawData || rawData.length === 0) {
//             await t.rollback();
//             return res.status(400).json({ success: false, message: 'File excel không có dữ liệu.' });
//         }

//         // --- 2. CHUẨN BỊ LOOKUP DATA (SỬA LỖI TẠI ĐÂY) ---
//         // Lưu ý: Tôi đã xóa 'ma_coso' và 'ma_chuyennganh' để tránh lỗi nếu DB không có cột này
//         const [allKhoa, allCoSo, allChuyenNganh] = await Promise.all([
//             db.Khoa.findAll({ attributes: ['khoa_id', 'ma_khoa', 'ten_khoa'] }),
            
//             // SỬA LỖI: Chỉ lấy coso_id và ten_coso
//             db.CoSo.findAll({ attributes: ['coso_id', 'ten_coso'] }), 
            
//             // SỬA LỖI: Tạm thời bỏ ma_chuyennganh cho an toàn, nếu DB bạn có thì thêm vào lại
//             db.ChuyenNganh.findAll({ attributes: ['chuyennganh_id', 'ten_chuyennganh'] }) 
//         ]);

//         const preparedClasses = [];
//         const errors = [];

//         // Helper normalize string
//         const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';

//         // 3. Duyệt từng dòng
//         for (let i = 0; i < rawData.length; i++) {
//             const rawRow = rawData[i];
//             const rowNumber = headerRowIndex + i + 2; 

//             // Chuẩn hóa tên cột (Trim space)
//             const row = {};
//             Object.keys(rawRow).forEach(key => {
//                 row[key.trim()] = rawRow[key];
//             });

//             // Map cột Excel
//             const tenLop = row['MÃ LỚP'];
//             const heDT = row['HỆ ĐT']; 
//             const khoaStr = row['KHÓA']; 
//             const donViMa = row['ĐƠN VỊ']; 
//             const coSoTen = row['CƠ SỞ']; 
//             const chuyenNganhTen = row['Chuyên ngành']; 
//             const siSo = row['SĨ SỐ']; 

//             if (!tenLop && !donViMa) continue; // Bỏ qua dòng trống

//             // Validate
//             if (!tenLop) {
//                 errors.push(`Dòng ${rowNumber}: Thiếu "MÃ LỚP"`);
//                 continue;
//             }

//             // --- Logic Lookup ID ---
            
//             // 1. Tìm Khoa (Theo mã hoặc tên)
//             let foundKhoa = null;
//             if (donViMa) {
//                 const searchKey = normalize(donViMa);
//                 foundKhoa = allKhoa.find(k => 
//                     normalize(k.ma_khoa) === searchKey || normalize(k.ten_khoa) === searchKey
//                 );
//             }
//             if (!foundKhoa && donViMa) errors.push(`Dòng ${rowNumber}: Không tìm thấy Đơn vị "${donViMa}"`);

//             // 2. Tìm Cơ Sở (Chỉ tìm theo tên vì DB không có ma_coso)
//             let foundCoSo = null;
//             if (coSoTen) {
//                 const searchKey = normalize(coSoTen);
//                 foundCoSo = allCoSo.find(cs => normalize(cs.ten_coso) === searchKey);
//             }
//             if (!foundCoSo && coSoTen) errors.push(`Dòng ${rowNumber}: Không tìm thấy Cơ sở "${coSoTen}"`);

//             // 3. Tìm Chuyên Ngành (Tìm theo tên)
//             let foundChuyenNganh = null;
//             if (chuyenNganhTen) {
//                 const searchKey = normalize(chuyenNganhTen);
//                 foundChuyenNganh = allChuyenNganh.find(cn => normalize(cn.ten_chuyennganh) === searchKey);
//             }

//             // 4. Xử lý Niên khóa
//             let nienKhoaInt = new Date().getFullYear();
//             if (khoaStr) {
//                 const matchParens = khoaStr.toString().match(/\((\d{2})-/); 
//                 const matchFull = khoaStr.toString().match(/20\d{2}/); 
                
//                 if (matchParens && matchParens[1]) {
//                     nienKhoaInt = 2000 + parseInt(matchParens[1]);
//                 } else if (matchFull) {
//                     nienKhoaInt = parseInt(matchFull[0]);
//                 }
//             }

//             if (errors.length > 0) continue; 

//             // Push Data
//             preparedClasses.push({
//                 lop_hanhchinh_id: db.Sequelize.literal('UUID()'),
//                 ten_lop: tenLop,
//                 nien_khoa: nienKhoaInt,
//                 chuong_trinh: heDT || 'Đại học',
//                 khoa_id: foundKhoa ? foundKhoa.khoa_id : null,
//                 coso_id: foundCoSo ? foundCoSo.coso_id : null,
//                 chuyennganh_id: foundChuyenNganh ? foundChuyenNganh.chuyennganh_id : null,
//                 si_so: parseInt(siSo) || 0,
//                 ghichu: `Import Excel: ${khoaStr || ''}`,
//                 ngay_tao: new Date(),
//                 isDeleted: false
//             });
//         }

//         // 4. Kiểm tra lỗi
//         if (errors.length > 0) {
//             await t.rollback();
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'Dữ liệu Excel không hợp lệ.', 
//                 details: errors 
//             });
//         }

//         if (preparedClasses.length === 0) {
//             await t.rollback();
//             return res.status(400).json({ success: false, message: 'Không tìm thấy dữ liệu hợp lệ để import.' });
//         }

//         // 5. Bulk Create
//         await db.LopHanhChinh.bulkCreate(preparedClasses, { 
//             transaction: t,
//             // updateOnDuplicate: ['nien_khoa', 'si_so'] // Bật cái này nếu DB có unique key ten_lop
//         });

//         await t.commit();

//         return res.status(200).json({
//             success: true,
//             message: `Import thành công ${preparedClasses.length} lớp học.`
//         });

//     } catch (error) {
//         await t.rollback();
//         console.error("Import Class Error:", error);
//         return res.status(500).json({ 
//             success: false, 
//             message: 'Lỗi server: ' + (error.original?.sqlMessage || error.message) 
//         });
//     }
// };






//////////////////////////////////////////////////////////////////////////////
// CHUYEN TIENG VIET CO DAU SANG KHONG DAU, GIU NGUYEN CASE CHUYEN CAPLOCK///
////////////////////////////////////////////////////////////////////////////

const toNonAccent = (str) => {
    if (!str) return '';
    str = str.toString();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
};

// const normalize = (str) => {
//     if (!str) return '';
//     let s = toNonAccent(str).toLowerCase();
//     s = s.replace(/[^a-z0-9]/g, ""); 
//     return s;
// }

const findVal = (row, keywords) => {
    if (!Array.isArray(keywords)) keywords = [keywords];
    const keys = Object.keys(row);
    for (const kw of keywords) {
        const cleanKw = kw.replace(/\s/g, ''); 
        const foundKey = keys.find(k => {
            const cleanK = toNonAccent(k).toLowerCase().replace(/\s/g, '');
            return cleanK.includes(cleanKw);
        });
        if (foundKey) return row[foundKey];
    }
    return undefined;
};

// ============================================================================
// 2. MAIN IMPORT FUNCTION (ĐÃ RÚT GỌN)
// ============================================================================

const importClasses = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng upload file excel.' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawMatrix = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // 1. Tìm dòng tiêu đề (Dựa vào cột "MÃ LỚP")
        let headerRowIndex = -1;
        for (let i = 0; i < rawMatrix.length; i++) {
            const row = rawMatrix[i];
            const isHeader = row.some(cell => cell && toNonAccent(cell).toLowerCase().replace(/\s/g,'').includes('malop'));
            if (isHeader) { headerRowIndex = i; break; }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy dòng tiêu đề chứa "Mã Lớp".' });
        }

        const rawData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        // 2. Load danh mục từ DB để Validate
        const [allKhoa, allCoSo, allGiangVien] = await Promise.all([
            db.Khoa.findAll({ where: { isDeleted: false } }),
            db.CoSo.findAll({ where: { isDeleted: false } }),
            db.GiangVien.findAll({ where: { isDeleted: false } })
        ]);

        // Tạo Map tra cứu
        const khoaMap = new Map();
        allKhoa.forEach(k => {
            khoaMap.set(normalize(k.ten_khoa), k.khoa_id);
            khoaMap.set(normalize(k.ma_khoa), k.khoa_id);
        });

        const cosoMap = new Map(allCoSo.map(cs => [normalize(cs.ten_coso), cs.coso_id]));

        // Tra cứu Giảng viên bằng cách nối Họ + Tên
        const gvMap = new Map(allGiangVien.map(gv => [
            normalize(`${gv.ho} ${gv.ten}`), 
            gv.giangvien_id
        ]));

        const preparedClasses = [];
        const errors = [];
        const currentFileClassNames = new Set();

        // 3. Duyệt từng dòng dữ liệu
        for (let i = 0; i < rawData.length; i++) {
            const rawRow = rawData[i];
            const rowNumber = headerRowIndex + i + 2;

            const tenLop = findVal(rawRow, ["malop", "lop"]);
            if (!tenLop) continue;

            const cleanTenLop = tenLop.toString().trim();
            if (currentFileClassNames.has(cleanTenLop.toUpperCase())) continue;
            currentFileClassNames.add(cleanTenLop.toUpperCase());

            // Đọc các giá trị từ Excel
            const heDT = findVal(rawRow, ["hedt", "he"]);
            const khoaHoc = findVal(rawRow, ["khoa", "khoahoc"]); // Ví dụ: K20(22-26)
            const siSo = findVal(rawRow, ["siso", "sl"]);
            const donViName = findVal(rawRow, ["donvi", "dv", "khoa"]);
            const coSoTen = findVal(rawRow, ["coso", "co so"]);
            const gvName = findVal(rawRow, ["giangvien", "chunhiem", "gvcn"]);

            // --- VALIDATE ---
            // A. Đơn vị (Khoa)
            let khoaId = null;
            if (donViName) {
                khoaId = khoaMap.get(normalize(donViName));
                if (!khoaId) errors.push(`Dòng ${rowNumber}: Đơn vị "${donViName}" không có trong DB.`);
            }

            // B. Cơ sở
            let cosoId = null;
            if (coSoTen) {
                cosoId = cosoMap.get(normalize(coSoTen));
                if (!cosoId) errors.push(`Dòng ${rowNumber}: Cơ sở "${coSoTen}" không tồn tại.`);
            }

            // C. Giảng viên chủ nhiệm
            let gvId = null;
            if (gvName) {
                gvId = gvMap.get(normalize(gvName));
                if (!gvId) errors.push(`Dòng ${rowNumber}: Giảng viên "${gvName}" không có trong danh sách.`);
            }

            // D. Xử lý Niên khóa (Lấy số 22 trong K20(22-26) -> 2022)
            let nienKhoaInt = new Date().getFullYear();
            if (khoaHoc) {
                const match = khoaHoc.toString().match(/\((\d{2})/);
                if (match) nienKhoaInt = 2000 + parseInt(match[1]);
            }

            preparedClasses.push({
                lop_hanhchinh_id: db.Sequelize.literal('UUID()'),
                ten_lop: cleanTenLop,
                nien_khoa: nienKhoaInt,
                chuong_trinh: heDT || 'Đại học',
                khoa_id: khoaId,
                coso_id: cosoId,
                giangvien_id: gvId,
                si_so: parseInt(siSo) || 0,
                ghichu: `Import file: ${khoaHoc || ''}`,
                ngay_tao: new Date(),
                isDeleted: false
            });
        }

        // 4. Nếu có lỗi thì return ngay không insert
        if (errors.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validate thất bại. Vui lòng khớp dữ liệu với hệ thống.',
                details: errors
            });
        }

        if (preparedClasses.length === 0) {
            await t.rollback();
            return res.status(200).json({ success: true, message: 'File không có dữ liệu mới.' });
        }

        // 5. Lưu vào Database
        await db.LopHanhChinh.bulkCreate(preparedClasses, { transaction: t });
        await t.commit();

        return res.status(200).json({
            success: true,
            message: `Import thành công ${preparedClasses.length} lớp học.`
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Import Error:", error);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + error.message });
    }
};

// Hàm normalize tối ưu để so sánh
const normalize = (str) => {
    if (!str) return '';
    return toNonAccent(str)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Xóa mọi ký tự đặc biệt bao gồm dấu gạch ngang, dấu cách
        .trim();
}





module.exports = {
    getAll,
    createLop,
    updateLop,
    getStudentsByClass,
    importClasses
};