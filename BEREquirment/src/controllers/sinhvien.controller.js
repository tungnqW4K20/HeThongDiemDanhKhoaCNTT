'use strict';
const db = require('../models');
const xlsx = require('xlsx')
const { Op } = require('sequelize');
const svService = require('../services/sinhvien.service');

// const getSinhVienByLop = async (req, res) => {
//     try {
//         const { lop_hanhchinh_id } = req.params;

//         const list = await svService.getSinhVienByLop(lop_hanhchinh_id);

//         return res.json({
//             success: true,
//             message: 'Lấy danh sách sinh viên thành công',
//             data: list
//         });
//     } catch (err) {
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

const getSinhVienByLop = async (req, res) => {
    try {
        const { lop_hanhchinh_id } = req.params;

        const result = await svService.getSinhVienByLop(lop_hanhchinh_id);

        // Chuẩn hóa dữ liệu trả về theo chuẩn API Chuyên nghiệp
        const responseData = {
            thong_tin_lop: {
                lop_id: result.lop_hanhchinh_id,
                ten_lop: result.ten_lop,
                nien_khoa: result.nien_khoa,
                chuong_trinh: result.chuong_trinh
            },
            giang_vien_chu_nhiem: result.GVCN ? {
                ho_ten: `${result.GVCN.ho} ${result.GVCN.ten}`.trim(),
                sdt: result.GVCN.sdt,
                email: result.GVCN.email
            } : null,
            danh_sach_sinh_vien: result.DanhSachSinhVien || []
        };

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách sinh viên và GVCN thành công',
            data: responseData
        });

    } catch (err) {
        console.error(">>> Error at getSinhVienByLop Controller:", err.message);
        return res.status(err.message.includes('Không tìm thấy') ? 404 : 500).json({
            success: false,
            message: err.message
        });
    }
};

const createSinhVien = async (req, res) => {
    try {
        const data = req.body;

        const sv = await svService.createSinhVien(data);

        return res.status(201).json({
            success: true,
            message: 'Thêm sinh viên thành công',
            data: sv
        });
    } catch (err) {
        const message = err.message || 'Lỗi thêm sinh viên';
        const statusCode = message.includes('Trùng mã sinh viên') ? 409 : 400;
        return res.status(statusCode).json({ success: false, message });
    }
};

const updateSinhVien = async (req, res) => {
    try {
        const { sinhvien_id } = req.params;
        const data = req.body;

        const sv = await svService.updateSinhVien(sinhvien_id, data);

        return res.json({
            success: true,
            message: 'Cập nhật sinh viên thành công',
            data: sv
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

const deleteSinhVien = async (req, res) => {
    try {
        const { sinhvien_id } = req.params;

        await svService.hardDeleteSinhVien(sinhvien_id);

        return res.json({
            success: true,
            message: 'Xóa sinh viên thành công'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};



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
    return str;
};

// --- HELPER: Tìm giá trị cột thông minh ---
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

// --- HELPER: Xử lý ngày tháng từ Excel ---
const parseExcelDate = (input) => {
    if (!input) return null;
    
    // Trường hợp 1: Là đối tượng Date (do thư viện xlsx parse sẵn)
    if (input instanceof Date) return input;

    // Trường hợp 2: Là số Serial Excel (VD: 44135)
    if (typeof input === 'number') {
        return new Date(Math.round((input - 25569) * 86400 * 1000));
    }

    // Trường hợp 3: Là chuỗi (VD: "20/10/2003" hoặc "2003-10-20")
    if (typeof input === 'string') {
        const parts = input.trim().split(/[\/\-]/);
        // Nếu format dd/mm/yyyy
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(input);
    }
    return null;
};

const importStudents = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { lop_hanhchinh_id } = req.body;
        
        // 1. Validate Input
        if (!req.file) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Vui lòng upload file excel.' });
        }
        if (!lop_hanhchinh_id) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Thiếu ID lớp hành chính.' });
        }

        // Check lớp có tồn tại không
        const lop = await db.LopHanhChinh.findByPk(lop_hanhchinh_id);
        if (!lop) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Lớp hành chính không tồn tại.' });
        }

        // 2. Đọc file Excel
        // cellDates: true giúp xlsx tự convert số serial thành Date object
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 3. Tìm dòng Header
        const rawMatrix = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        let headerRowIndex = -1;

        for (let i = 0; i < rawMatrix.length; i++) {
            const row = rawMatrix[i] || [];
            const hasMaSvColumn = row.some((cell) => {
                if (!cell) return false;
                const normalized = toNonAccent(cell.toString())
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                return normalized.includes('masv') || normalized.includes('mssv');
            });

            if (hasMaSvColumn) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Không tìm thấy cột "Mã SV" (MA_SV).' });
        }

        const rawData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        // 4. Xử lý dữ liệu
        const preparedStudents = [];
        const errors = [];
        const uniqueMaSV = new Set(); // Để lọc trùng trong file excel

        for (let i = 0; i < rawData.length; i++) {
            const rawRow = rawData[i];
            const rowNumber = headerRowIndex + i + 2;

            // Mapping cột linh hoạt
            const maSV = findVal(rawRow, ["masv", "ma_sv", "mssv"]);
            const hoTen = findVal(rawRow, ["hoten", "ho_ten", "ten", "hovaten"]);
            const ngaySinhRaw = findVal(rawRow, ["ngaysinh", "ngay_sinh", "ns"]);
            const email = findVal(rawRow, ["email", "thu_dien_tu"]);
            const sdt = findVal(rawRow, ["sdt", "dienthoai", "so_dien_thoai"]);
            // const gioiTinh = findVal(rawRow, ["gioitinh", "gioi_tinh"]); // Nếu cần

            if (!maSV && !hoTen) continue; // Skip dòng trống

            // Validate
            if (!maSV) {
                errors.push(`Dòng ${rowNumber}: Thiếu Mã SV`);
                continue;
            }
            if (!hoTen) {
                errors.push(`Dòng ${rowNumber}: Thiếu Họ tên`);
                continue;
            }

            const cleanMaSV = maSV.toString().trim();

            // Check trùng trong chính file Excel
            if (uniqueMaSV.has(cleanMaSV)) {
                // errors.push(`Dòng ${rowNumber}: Mã SV ${cleanMaSV} bị trùng lặp trong file.`);
                continue; // Skip dòng trùng
            }
            uniqueMaSV.add(cleanMaSV);

            // Parse ngày sinh
            const parsedDate = parseExcelDate(ngaySinhRaw);

            preparedStudents.push({
                sinhvien_id: db.Sequelize.literal('UUID()'),
                ma_sv: cleanMaSV,
                ten: hoTen.toString().trim(),
                email: email ? email.toString().trim() : null,
                sdt: sdt ? sdt.toString().trim() : null,
                ngaysinh: parsedDate,
                lop_hanhchinh_id: lop_hanhchinh_id, // Gán vào lớp đang chọn
                trang_thai: 'Đang học',
                isDeleted: false,
                ngay_tao: new Date(),
                row_number: rowNumber
            });
        }

        if (errors.length > 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Dữ liệu Excel lỗi.', details: errors });
        }

        if (preparedStudents.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Không tìm thấy dữ liệu sinh viên hợp lệ.' });
        }

        // 5. Import theo nguyên tắc "thêm vào lớp":
        // - Không chuyển lớp tự động.
        // - Nếu mã SV đã thuộc lớp khác thì ghi nhận thất bại kèm tên lớp hiện tại.
        const maSvList = preparedStudents.map((item) => item.ma_sv);
        const existedStudents = await db.SinhVien.findAll({
            where: { ma_sv: { [Op.in]: maSvList } },
            attributes: ['sinhvien_id', 'ma_sv', 'lop_hanhchinh_id'],
            transaction: t
        });
        const existedByMaSv = new Map(existedStudents.map((sv) => [sv.ma_sv, sv]));
        const existingClassIds = [...new Set(existedStudents.map((sv) => sv.lop_hanhchinh_id).filter(Boolean))];
        const existingClasses = existingClassIds.length > 0
            ? await db.LopHanhChinh.findAll({
                where: { lop_hanhchinh_id: { [Op.in]: existingClassIds } },
                attributes: ['lop_hanhchinh_id', 'ten_lop'],
                transaction: t
            })
            : [];
        const classNameById = new Map(existingClasses.map((item) => [item.lop_hanhchinh_id, item.ten_lop]));

        let createdCount = 0;
        const successRows = [];
        const failedRows = [];

        for (const item of preparedStudents) {
            const existed = existedByMaSv.get(item.ma_sv);

            if (!existed) {
                const { row_number, ...createPayload } = item;
                await db.SinhVien.create(createPayload, { transaction: t });
                createdCount += 1;
                successRows.push({
                    rowNumber: item.row_number,
                    label: `${item.ma_sv} - ${item.ten}`,
                    reason: 'Thêm mới thành công'
                });
                continue;
            }

            if (existed.lop_hanhchinh_id === lop_hanhchinh_id) {
                failedRows.push({
                    rowNumber: item.row_number,
                    label: `${item.ma_sv} - ${item.ten}`,
                    reason: 'Sinh viên đã tồn tại trong lớp này'
                });
                continue;
            }

            if (!existed.lop_hanhchinh_id) {
                await db.SinhVien.update(
                    {
                        lop_hanhchinh_id: lop_hanhchinh_id,
                        isDeleted: false
                    },
                    {
                        where: { sinhvien_id: existed.sinhvien_id },
                        transaction: t
                    }
                );
                successRows.push({
                    rowNumber: item.row_number,
                    label: `${item.ma_sv} - ${item.ten}`,
                    reason: 'Gán lớp thành công (sinh viên chưa có lớp)'
                });
                continue;
            }

            const currentClassName = classNameById.get(existed.lop_hanhchinh_id) || 'Không rõ lớp';
            failedRows.push({
                rowNumber: item.row_number,
                label: `${item.ma_sv} - ${item.ten}`,
                reason: `Sinh viên đang thuộc lớp ${currentClassName}`
            });
        }

        await t.commit();

        const failedCount = failedRows.length;

        return res.status(200).json({
            success: true,
            message: `Kết quả import: thêm thành công ${createdCount}, thêm thất bại ${failedCount}.`,
            data: {
                total: preparedStudents.length,
                created: createdCount,
                failed: failedCount,
                success_rows: successRows,
                failed_rows: failedRows
            }
        });

    } catch (error) {
        await t.rollback();
        console.error("Import Student Error:", error);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};



module.exports = {
    getSinhVienByLop,
    createSinhVien,
    updateSinhVien,
    deleteSinhVien,
    importStudents,
};
