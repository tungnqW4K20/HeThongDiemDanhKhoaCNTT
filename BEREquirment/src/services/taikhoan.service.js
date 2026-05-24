'use strict';
const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

const getAllTaiKhoan = async () => {
    try {
        const accounts = await db.TaiKhoan.findAll({
            include: [
                {
                    model: db.GiangVien,
                    as: 'GiangVien',
                    attributes: ['ma_gv', 'ho', 'ten', 'email']
                },
                {
                    model: db.BoMon,
                    as: 'DanhSachBoMonQuanLy',
                    attributes: ['bomon_id', 'ten_bomon']
                },
                {
                    model: db.Khoa,
                    as: 'KhoaQuanLy',
                    attributes: ['khoa_id', 'ten_khoa']
                }
            ],
            order: [['ngay_tao', 'DESC']]
        });
        return {
            errCode: 0,
            message: 'Lấy danh sách tài khoản thành công',
            data: accounts
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi lấy danh sách tài khoản'
        };
    }
};

const createTaiKhoan = async (data) => {
    try {
        if (!data.username || !data.password || !data.vaitro) {
            return {
                errCode: 1,
                message: 'Thiếu thông tin bắt buộc (username, password, vaitro)'
            };
        }

        // Kiểm tra username tồn tại
        const existing = await db.TaiKhoan.findOne({ where: { username: data.username } });
        if (existing) {
            return {
                errCode: 2,
                message: 'Tên đăng nhập đã tồn tại'
            };
        }

        // Hash mật khẩu
        const salt = bcrypt.genSaltSync(10);
        const password_hash = bcrypt.hashSync(data.password, salt);

        const newAccount = await db.TaiKhoan.create({
            username: data.username,
            password_hash: password_hash,
            vaitro: data.vaitro,
            ref_id: data.ref_id || null
        });

        // Nếu là trưởng bộ môn, cập nhật bảng BoMon
        if (data.vaitro === 'truongbomon' && data.managed_bomon_ids && Array.isArray(data.managed_bomon_ids)) {
            await db.BoMon.update(
                { truong_bomon_id: newAccount.taikhoan_id },
                { where: { bomon_id: { [Op.in]: data.managed_bomon_ids } } }
            );
        }

        // Nếu là lãnh đạo, cập nhật bảng Khoa
        if (data.vaitro === 'lanhdao' && data.managed_khoa_id) {
            await db.Khoa.update(
                { lanh_dao_id: newAccount.taikhoan_id },
                { where: { khoa_id: data.managed_khoa_id } }
            );
        }

        return {
            errCode: 0,
            message: 'Tạo tài khoản thành công',
            data: newAccount
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi tạo tài khoản'
        };
    }
};

const updateTaiKhoan = async (id, data) => {
    try {
        const account = await db.TaiKhoan.findByPk(id);
        if (!account) {
            return {
                errCode: 1,
                message: 'Tài khoản không tồn tại'
            };
        }

        // Nếu có đổi username
        if (data.username && data.username !== account.username) {
            const existing = await db.TaiKhoan.findOne({ 
                where: { 
                    username: data.username,
                    taikhoan_id: { [Op.ne]: id } 
                } 
            });
            if (existing) {
                return {
                    errCode: 2,
                    message: 'Tên đăng nhập đã tồn tại'
                };
            }
            account.username = data.username;
        }

        // Cập nhật thông tin cơ bản
        if (data.vaitro) account.vaitro = data.vaitro;
        if (data.ref_id !== undefined) account.ref_id = data.ref_id;

        // Nếu có đổi mật khẩu
        if (data.password) {
            const salt = bcrypt.genSaltSync(10);
            account.password_hash = bcrypt.hashSync(data.password, salt);
        }

        await account.save();

        // Cập nhật quản lý bộ môn
        // BƯỚC 1: Xóa toàn bộ liên kết cũ của tài khoản này
        await db.BoMon.update(
            { truong_bomon_id: null },
            { where: { truong_bomon_id: id } }
        );

        // BƯỚC 2: Gán liên kết mới
        if (data.vaitro === 'truongbomon' && data.managed_bomon_ids && Array.isArray(data.managed_bomon_ids)) {
            await db.BoMon.update(
                { truong_bomon_id: id },
                { where: { bomon_id: { [Op.in]: data.managed_bomon_ids } } }
            );
        }

        // Cập nhật quản lý khoa
        await db.Khoa.update(
            { lanh_dao_id: null },
            { where: { lanh_dao_id: id } }
        );

        if (data.vaitro === 'lanhdao' && data.managed_khoa_id) {
            await db.Khoa.update(
                { lanh_dao_id: id },
                { where: { khoa_id: data.managed_khoa_id } }
            );
        }

        return {
            errCode: 0,
            message: 'Cập nhật tài khoản thành công',
            data: account
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi cập nhật tài khoản'
        };
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

const importTaiKhoanExcelService = async (fileBuffer) => {
    const { v4: uuidv4 } = await import('uuid');
    const transaction = await db.sequelize.transaction();
    
    try {
        let workbook;
        try {
            workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        } catch (e) {
            await transaction.rollback();
            return {
                errCode: 1,
                message: 'Lỗi định dạng file Excel không hợp lệ'
            };
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawData.length === 0) {
            await transaction.rollback();
            return {
                errCode: 2,
                message: 'File Excel rỗng hoặc không đúng cấu trúc'
            };
        }

        // Load reference data to validate references and speed up lookups
        const allLecturers = await db.GiangVien.findAll({ attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten'] });
        const allBoMons = await db.BoMon.findAll({ attributes: ['bomon_id', 'ma_bomon', 'ten_bomon'] });
        const allFaculties = await db.Khoa.findAll({ attributes: ['khoa_id', 'ma_khoa', 'ten_khoa'] });
        const allExistingAccounts = await db.TaiKhoan.findAll({ attributes: ['username'] });

        // Maps/Sets for fast O(1) checks
        const existingUsernames = new Set(allExistingAccounts.map(a => normalize(a.username)));
        
        const lecturerMap = new Map(); // ma_gv -> giangvien_id
        const lecturerNameMap = new Map(); // ma_gv -> ho_ten
        allLecturers.forEach(l => {
            lecturerMap.set(normalize(l.ma_gv), l.giangvien_id);
            lecturerNameMap.set(normalize(l.ma_gv), `${l.ho} ${l.ten}`);
        });

        const bomonMap = new Map(); // ma_bomon -> bomon_id
        allBoMons.forEach(b => {
            bomonMap.set(normalize(b.ma_bomon), b.bomon_id);
        });

        const khoaMap = new Map(); // ma_khoa -> khoa_id
        allFaculties.forEach(f => {
            khoaMap.set(normalize(f.ma_khoa), f.khoa_id);
        });

        const listToInsert = [];
        const successRows = [];
        const failedRows = [];
        
        // Track usernames processed in this file to prevent duplicates within the file itself
        const processedUsernamesInFile = new Set();

        const validRoles = new Set(['admin', 'giangvien', 'lanhdao', 'truongbomon']);

        // Cache department and faculty managers updates to execute post-insert
        const boMonManagerUpdates = [];
        const khoaManagerUpdates = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const rowNum = i + 2; // Row number in Excel (header is row 1)

            // Extract fields
            const usernameVal = findValueInRow(row, ['tendangnhap', 'username', 'tai_khoan', 'taikhoan', 'username']);
            const passwordVal = findValueInRow(row, ['matkhau', 'password', 'mat_khau', 'pass']);
            const vaitroVal = findValueInRow(row, ['vaitro', 'role', 'vai_tro']);
            const maGvVal = findValueInRow(row, ['magiangvien', 'magv', 'ma_gv', 'ma_giang_vien', 'lecturer_code']);
            const maBomonVal = findValueInRow(row, ['mabomon', 'ma_bomon', 'ma_bo_mon', 'department_code']);
            const maKhoaVal = findValueInRow(row, ['makhoa', 'ma_khoa', 'faculty_code']);

            // Bỏ qua nếu dòng hoàn toàn trống (không có bất cứ dữ liệu nào ở các cột chính)
            const isRowEmpty = !usernameVal && !passwordVal && !vaitroVal && !maGvVal && !maBomonVal && !maKhoaVal;
            if (isRowEmpty) {
                continue;
            }

            const rawLabel = usernameVal ? `Tài khoản "${usernameVal}"` : `Dòng ${rowNum}`;

            // Check missing username / password / role
            if (!usernameVal || !passwordVal || !vaitroVal) {
                failedRows.push({
                    rowNumber: rowNum,
                    label: rawLabel,
                    reason: 'Thiếu thông tin bắt buộc (Tên đăng nhập, Mật khẩu, Vai trò)'
                });
                continue;
            }

            const username = usernameVal.toString().trim();
            const password = passwordVal.toString().trim();
            const rawRole = vaitroVal.toString().trim().toLowerCase();
            const cleanUsername = normalize(username);

            // Clean & Map role
            let vaitro = rawRole;
            // Map simple vietnamese strings just in case
            if (rawRole.includes('admin') || rawRole.includes('quan tri')) vaitro = 'admin';
            else if (rawRole.includes('giang vien') || rawRole.includes('giangvien') || rawRole.includes('gv')) vaitro = 'giangvien';
            else if (rawRole.includes('truong bo mon') || rawRole.includes('truongbomon') || rawRole.includes('tbm')) vaitro = 'truongbomon';
            else if (rawRole.includes('lanh dao') || rawRole.includes('lanhdao') || rawRole.includes('ld')) vaitro = 'lanhdao';

            if (!validRoles.has(vaitro)) {
                failedRows.push({
                    rowNumber: rowNum,
                    label: rawLabel,
                    reason: `Vai trò "${vaitroVal}" không hợp lệ. Phải thuộc: admin, giangvien, truongbomon, lanhdao`
                });
                continue;
            }

            // Check duplicate username in DB
            if (existingUsernames.has(cleanUsername)) {
                failedRows.push({
                    rowNumber: rowNum,
                    label: rawLabel,
                    reason: `Tên đăng nhập "${username}" đã tồn tại trên hệ thống`
                });
                continue;
            }

            // Check duplicate username inside the file
            if (processedUsernamesInFile.has(cleanUsername)) {
                failedRows.push({
                    rowNumber: rowNum,
                    label: rawLabel,
                    reason: `Tên đăng nhập "${username}" bị lặp lại trong file import`
                });
                continue;
            }

            // Check Lecturer link (ma_gv)
            let ref_id = null;
            let lecturerLabel = '';
            if (maGvVal) {
                const cleanMaGv = normalize(maGvVal);
                if (!lecturerMap.has(cleanMaGv)) {
                    failedRows.push({
                        rowNumber: rowNum,
                        label: rawLabel,
                        reason: `Mã giảng viên "${maGvVal}" không tồn tại trên hệ thống`
                    });
                    continue;
                }
                ref_id = lecturerMap.get(cleanMaGv);
                lecturerLabel = ` (Liên kết GV: ${lecturerNameMap.get(cleanMaGv)})`;
            }

            // Validate department mapping for truongbomon
            let bomonId = null;
            if (vaitro === 'truongbomon' && maBomonVal) {
                const cleanMaBomon = normalize(maBomonVal);
                if (!bomonMap.has(cleanMaBomon)) {
                    failedRows.push({
                        rowNumber: rowNum,
                        label: rawLabel,
                        reason: `Mã Bộ môn "${maBomonVal}" không tồn tại trên hệ thống`
                    });
                    continue;
                }
                bomonId = bomonMap.get(cleanMaBomon);
            }

            // Validate faculty mapping for lanhdao
            let khoaId = null;
            if (vaitro === 'lanhdao' && maKhoaVal) {
                const cleanMaKhoa = normalize(maKhoaVal);
                if (!khoaMap.has(cleanMaKhoa)) {
                    failedRows.push({
                        rowNumber: rowNum,
                        label: rawLabel,
                        reason: `Mã Khoa "${maKhoaVal}" không tồn tại trên hệ thống`
                    });
                    continue;
                }
                khoaId = khoaMap.get(cleanMaKhoa);
            }

            // Save for processing
            const taikhoan_id = uuidv4();
            const salt = bcrypt.genSaltSync(10);
            const password_hash = bcrypt.hashSync(password, salt);

            listToInsert.push({
                taikhoan_id,
                username,
                password_hash,
                vaitro,
                ref_id,
                ngay_tao: new Date()
            });

            // If truongbomon, cache BoMon update
            if (vaitro === 'truongbomon' && bomonId) {
                boMonManagerUpdates.push({
                    bomon_id: bomonId,
                    truong_bomon_id: taikhoan_id
                });
            }

            // If lanhdao, cache Khoa update
            if (vaitro === 'lanhdao' && khoaId) {
                khoaManagerUpdates.push({
                    khoa_id: khoaId,
                    lanh_dao_id: taikhoan_id
                });
            }

            processedUsernamesInFile.add(cleanUsername);
            successRows.push({
                rowNumber: rowNum,
                label: rawLabel,
                reason: `Vai trò: ${vaitro}${lecturerLabel}`
            });
        }

        // Perform inserts & updates within transaction
        if (listToInsert.length > 0) {
            await db.TaiKhoan.bulkCreate(listToInsert, { transaction });

            // Execute department manager updates
            for (const update of boMonManagerUpdates) {
                await db.BoMon.update(
                    { truong_bomon_id: update.truong_bomon_id },
                    { where: { bomon_id: update.bomon_id }, transaction }
                );
            }

            // Execute faculty manager updates
            for (const update of khoaManagerUpdates) {
                await db.Khoa.update(
                    { lanh_dao_id: update.lanh_dao_id },
                    { where: { khoa_id: update.khoa_id }, transaction }
                );
            }
        }

        await transaction.commit();

        return {
            errCode: 0,
            message: `Import thành công ${listToInsert.length} tài khoản.`,
            data: {
                totalRows: listToInsert.length + failedRows.length,
                successCount: listToInsert.length,
                failedCount: failedRows.length
            },
            successRows,
            failedRows
        };

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi Import TaiKhoan Excel:", error);
        return {
            errCode: -1,
            message: 'Lỗi máy chủ khi import tài khoản: ' + error.message
        };
    }
};

const deleteTaiKhoan = async (id) => {
    try {
        const account = await db.TaiKhoan.findByPk(id);
        if (!account) {
            return {
                errCode: 1,
                message: 'Tài khoản không tồn tại'
            };
        }

        // Không cho phép xóa chính mình (nếu cần logic này, admin hiện tại đang thực hiện)
        // Ở đây chỉ thực hiện xóa đơn thuần
        await account.destroy();

        return {
            errCode: 0,
            message: 'Xóa tài khoản thành công'
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi xóa tài khoản'
        };
    }
};

module.exports = {
    getAllTaiKhoan,
    createTaiKhoan,
    updateTaiKhoan,
    deleteTaiKhoan,
    importTaiKhoanExcelService
};
