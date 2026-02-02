'use strict';
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const db = require('../models');
const { Op } = require('sequelize');
/**
 * ===== HELPER FUNCTIONS (đặt ở đây) =====
 */
async function buildMaLopHocPhan({ lopCodes, maMon }) {
  if (lopCodes.length > 1) {
    return lopCodes.join('-');
  }

  const base = `${lopCodes[0]}-${maMon}`;

  const existed = await db.LopHocPhan.findAll({
    where: {
      ten_lophocphan: { [Op.like]: `${base}%` }
    },
    attributes: ['ten_lophocphan']
  });

  if (!existed.length) return base;

  let max = 0;
  existed.forEach(e => {
    const match = e.ten_lophocphan.match(/\.(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  });

  return `${base}.${max + 1}`;
}

function calcNgayHoc(tuan, thu) {
  const START_DATE = dayjs('2025-08-01');
  const startOfWeek = START_DATE
    .add(tuan - 1, 'week')
    .startOf('week')
    .add(1, 'day'); // thứ 2

  return startOfWeek.add(thu - 2, 'day').format('YYYY-MM-DD');
}
async function generateMaMon() {
  const lastMon = await db.MonHoc.findOne({
    order: [['ma_mon', 'DESC']],
    attributes: ['ma_mon']
  });

  if (!lastMon || isNaN(Number(lastMon.ma_mon))) {
    return '1001';
  }

  return String(Number(lastMon.ma_mon) + 1);
}
class ImportService {

  static async importBuoiHocFromExcel(req, res) {
    const filePath = req.file?.path;
    if (!filePath) {
      return res.status(400).json({ message: 'Không tìm thấy file' });
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    let createdLHP = 0;
    let createdBuoiHoc = 0;
    let skipped = 0;
    const errors = [];

    const t = await db.sequelize.transaction();

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const tuan = Number(row['Tuần']);
        const thu = Number(row['Thứ']);
        const tietBatDau = Number(row['Tiết bắt đầu']);
        const soTiet = Number(row['Số tiết']);
        const phong = row['Tên phòng'];

        const maLopRaw = String(row['Mã lớp'] || '').trim();
        const tenMonRaw = String(row['Tên học phần'] || '').trim();
        const maGV = String(row['Mã GV'] || '').trim();

        if (!tuan || !thu || !maLopRaw || !tenMonRaw || !maGV) {
          skipped++;
          continue;
        }

        const ngayHoc = calcNgayHoc(tuan, thu);

        // ===== Giảng viên =====
        const giangVien = await db.GiangVien.findOne({
          where: { ma_gv: maGV },
          transaction: t
        });
        if (!giangVien) {
          errors.push({ row: i + 2, error: 'Không tìm thấy giảng viên', maGV });
          skipped++;
          continue;
        }
let monHoc = await db.MonHoc.findOne({
  where: db.sequelize.where(
    db.sequelize.fn('LOWER', db.sequelize.col('ten_mon')),
    tenMonRaw.toLowerCase()
  ),
  transaction: t
});

if (!monHoc) {
  const newMaMon = await generateMaMon();

  monHoc = await db.MonHoc.create({
    ma_mon: newMaMon,
    ten_mon: tenMonRaw,
    sotinchi: null,
    mota: null
  }, { transaction: t });
}
        // ===== Lớp hành chính =====
        const lopCodes = maLopRaw.split('-').map(s => s.trim());
        const lopHanhChinhs = [];

        for (const code of lopCodes) {
          const lopHC = await db.LopHanhChinh.findOne({
            where: { ma_lop: code }, // ⚠️ nếu bạn chưa có ma_lop thì đổi sang ten_lop
            transaction: t
          });
          if (!lopHC) {
            errors.push({ row: i + 2, error: 'Không tìm thấy lớp hành chính', code });
            continue;
          }
          lopHanhChinhs.push(lopHC);
        }

        if (lopHanhChinhs.length !== lopCodes.length) {
          skipped++;
          continue;
        }

        // ===== Lớp học phần =====
        const maLopHocPhan = await buildMaLopHocPhan({
          lopCodes,
          maMon: monHoc.ma_mon
        });

        let lopHocPhan = await db.LopHocPhan.findOne({
          where: { ten_lophocphan: maLopHocPhan },
          transaction: t
        });

        if (!lopHocPhan) {
          lopHocPhan = await db.LopHocPhan.create({
            ten_lophocphan: maLopHocPhan,
            monhoc_id: monHoc.monhoc_id,
            giangvien_id: giangVien.giangvien_id,
            phong: phong
          }, { transaction: t });

          createdLHP++;

          // link lớp hành chính
          for (const lopHC of lopHanhChinhs) {
            await db.LHP_LHC.findOrCreate({
              where: {
                lophocphan_id: lopHocPhan.lophocphan_id,
                lop_hanhchinh_id: lopHC.lop_hanhchinh_id
              },
              defaults: {
                lophocphan_id: lopHocPhan.lophocphan_id,
                lop_hanhchinh_id: lopHC.lop_hanhchinh_id
              },
              transaction: t
            });
          }
        }

        // ===== Buổi học =====
        const [buoiHoc, created] = await db.BuoiHoc.findOrCreate({
          where: {
            lophocphan_id: lopHocPhan.lophocphan_id,
            ngay: ngayHoc
          },
          defaults: {
            trangthai: 'scheduled',
            tiet_batdau: tietBatDau,
            so_tiet: soTiet,
            phong: phong
          },
          transaction: t
        });

        if (created) createdBuoiHoc++;
      }

      await t.commit();
      return res.json({
        message: 'Import hoàn tất',
        createdLopHocPhan: createdLHP,
        createdBuoiHoc,
        skipped,
        errors
      });

    } catch (err) {
      await t.rollback();
      return res.status(500).json({
        message: 'Lỗi import',
        error: err.message
      });
    }
  }
}

module.exports = ImportService;
