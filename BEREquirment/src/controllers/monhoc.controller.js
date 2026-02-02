const monHocService = require('../services/monhoc.service');
const db = require('../models');
const xlsx = require('xlsx');



const handleGetAll = async (req, res) => {
    try {
        const response = await monHocService.getAllMonHoc(req.query);
        return res.status(200).json(response);
    } catch (error) {
        console.error('GetAll MonHoc Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách' });
    }
};

const handleGetById = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await monHocService.getMonHocById(id);
        if (!response.success) {
            return res.status(404).json(response);
        }
        return res.status(200).json(response);
    } catch (error) {
        console.error('GetById MonHoc Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const handleCreate = async (req, res) => {
    try {
        const { ma_mon, ten_mon, sotinchi, khoa_id } = req.body;
        
        if (!ma_mon || !ten_mon || !sotinchi) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin bắt buộc' });
        }

        const response = await monHocService.createMonHoc(req.body);
        if (!response.success) {
            return res.status(400).json(response); 
        }
        return res.status(201).json(response);
    } catch (error) {
        console.error('Create MonHoc Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi tạo mới' });
    }
};

const handleUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await monHocService.updateMonHoc(id, req.body);
        if (!response.success) {
            return res.status(400).json(response);
        }
        return res.status(200).json(response);
    } catch (error) {
        console.error('Update MonHoc Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật' });
    }
};

const handleDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await monHocService.deleteMonHoc(id);
        if (!response.success) {
            return res.status(404).json(response);
        }
        return res.status(200).json(response);
    } catch (error) {
        console.error('Delete MonHoc Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi xóa' });
    }
};

// Chuyển tiếng Việt có dấu thành không dấu
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



const importMonHocExcel = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng upload file excel.' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawData.length === 0) {
            return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu.' });
        }

        // 1. Lấy dữ liệu tham chiếu để Validate
        const [allKhoa, allExistingMons] = await Promise.all([
            db.Khoa.findAll({ where: { isDeleted: false }, attributes: ['khoa_id', 'ma_khoa', 'ten_khoa'] }),
            db.MonHoc.findAll({ attributes: ['ma_mon'] })
        ]);

        // Tạo Map để tra cứu nhanh O(1)
        const khoaMap = new Map();
        allKhoa.forEach(k => {
            khoaMap.set(normalize(k.ma_khoa), k.khoa_id);
            // Có thể map thêm cả tên khoa nếu muốn linh hoạt
            khoaMap.set(normalize(k.ten_khoa), k.khoa_id);
        });

        const existingCodesInDB = new Set(allExistingMons.map(m => normalize(m.ma_mon)));
        const codesInCurrentFile = new Set();
        
        const listToInsert = [];
        const errors = [];

        // 2. Duyệt từng dòng để Validate
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const rowNum = i + 2; // Dòng 1 thường là header

            const maMon = findValueInRow(row, ['mamon', 'ma mon']);
            const tenMon = findValueInRow(row, ['tenmon', 'ten mon']);
            const soTC = findValueInRow(row, ['sotc', 'so tc', 'tinchi']);
            const maKhoaExcel = findValueInRow(row, ['makhoa', 'ma khoa', 'khoa']);

            // --- KIỂM TRA DỮ LIỆU ---
            
            // A. Thiếu thông tin bắt buộc
            if (!maMon || !tenMon) {
                errors.push(`Dòng ${rowNum}: Thiếu Mã môn hoặc Tên môn.`);
                continue;
            }

            const cleanMaMon = maMon.toString().trim();
            const normMaMon = normalize(cleanMaMon);

            // B. Kiểm tra trùng mã môn trong DB
            if (existingCodesInDB.has(normMaMon)) {
                errors.push(`Dòng ${rowNum}: Mã môn "${cleanMaMon}" đã tồn tại trong hệ thống.`);
            }

            // C. Kiểm tra trùng mã môn trong chính file Excel
            if (codesInCurrentFile.has(normMaMon)) {
                errors.push(`Dòng ${rowNum}: Mã môn "${cleanMaMon}" bị trùng lặp trong file.`);
            }
            codesInCurrentFile.add(normMaMon);

            // D. Kiểm tra Khoa
            let khoaId = null;
            if (maKhoaExcel) {
                const normMaKhoa = normalize(maKhoaExcel);
                khoaId = khoaMap.get(normMaKhoa);
                if (!khoaId) {
                    errors.push(`Dòng ${rowNum}: Mã khoa "${maKhoaExcel}" không tồn tại trên hệ thống.`);
                }
            } else {
                errors.push(`Dòng ${rowNum}: Cột Mã khoa không được để trống.`);
            }

            // Nếu dòng này đã có lỗi thì không cần chuẩn bị data insert cho dòng này nữa
            if (errors.length > 100) break; // Giới hạn báo lỗi để tránh tràn response
            if (errors.some(err => err.startsWith(`Dòng ${rowNum}`))) continue;

            // E. Chuẩn bị data
            listToInsert.push({
                monhoc_id: db.Sequelize.literal('UUID()'),
                ma_mon: cleanMaMon,
                ten_mon: tenMon.toString().trim(),
                sotinchi: parseInt(soTC) || 0,
                khoa_id: khoaId,
                // mota: 'Imported via Excel',
                isDeleted: false
            });
        }

        // 3. Xử lý kết quả Validate
        if (errors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu Excel không hợp lệ. Vui lòng sửa các lỗi sau:',
                details: errors
            });
        }

        if (listToInsert.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Không tìm thấy dữ liệu hợp lệ để import.' });
        }

        // 4. Thực hiện Insert
        await db.MonHoc.bulkCreate(listToInsert, { transaction });
        await transaction.commit();

        return res.status(200).json({
            success: true,
            message: `Import thành công ${listToInsert.length} môn học.`
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Import Error:", error);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};


module.exports = {
    handleGetAll,
    handleGetById,
    handleCreate,
    handleUpdate,
    handleDelete,
    importMonHocExcel
};