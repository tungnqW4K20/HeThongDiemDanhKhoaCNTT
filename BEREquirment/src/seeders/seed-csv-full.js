const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const dayjs = require('dayjs');
const db = require('../models');

async function seedData() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected.');

    // Ensure Khoa exists
    const [khoa] = await db.Khoa.findOrCreate({
      where: { ten_khoa: 'Công nghệ thông tin' },
      defaults: { ma_khoa: 'CN' }
    });

    const [namHoc] = await db.NamHoc.findOrCreate({
      where: { ten_namhoc: '2025-2026' },
      defaults: { ngay_batdau: '2025-08-01', ngay_ketthuc: '2026-06-01' }
    });

    const [hocKy] = await db.HocKy.findOrCreate({
      where: { ten_hocky: 'Học kỳ 1' },
      defaults: { 
          namhoc_id: namHoc.namhoc_id,
          ngay_batdau: '2025-08-01',
          ngay_ketthuc: '2026-01-18',
          ngay_monday_tuan_1: '2025-07-28'
      }
    });

    const studentFile = path.resolve(__dirname, '../../../DanhSachSinhVien_221129_125252.csv');
    const cnpmFile = path.resolve(__dirname, '../../../ThanhTraGiangDay_01082025_18012026 CNPM.csv');
    const khmtFile = path.resolve(__dirname, '../../../ThanhTraGiangDay_01082025_18012026 KHMT.csv');

    console.log('Reading Schedule CSVs...');
    
    // Read and parse CSV using xlsx
    const processSchedule = async (filePath) => {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }
        const workbook = xlsx.readFile(filePath, { type: 'file' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        
        let startParsing = false;
        let headers = [];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const firstCell = String(row[0] || '').trim();
            if (firstCell === 'Tuần') {
                startParsing = true;
                headers = row.map(h => String(h || '').trim());
                continue;
            }

            if (startParsing && firstCell && !isNaN(parseInt(firstCell)) && headers.length > 5) {
                const getVal = (colName) => {
                    const idx = headers.findIndex(h => h && h.includes(colName));
                    return idx !== -1 ? row[idx] : null;
                };

                const tuan = parseInt(getVal('Tuần'));
                const thu = parseInt(getVal('Thứ'));
                const tiet_bat_dau = parseInt(getVal('Tiết bắt đầu'));
                const so_tiet = parseInt(getVal('tiêt') || getVal('Số tiêt') || getVal('Số tiết') || 1);
                const phong = getVal('Tên phòng');
                let ma_lophocphans = String(getVal('Mã lớp') || '').replace(/\n/g, ',').split(',').map(s=>s.trim()).filter(Boolean);
                const ten_hocphan = String(getVal('Tên học phần') || '');
                const ma_gv = getVal('Mã GV');
                
                const hoverGV = String(getVal('Họ và tên GV') || '').trim();
                const tnGV = String(row[headers.findIndex(h=>h && h.includes('Họ và tên GV')) + 1] || '').trim();
                const sdt_gv = getVal('Điện thoại GV');
                const tchat = String(getVal('chất') || getVal('T/chất') || getVal('T/ chất') || 'LT').replace(/[\r\n]/g, '').trim();

                if (!ma_gv || !ten_hocphan) continue;

                const [giang_vien] = await db.GiangVien.findOrCreate({
                    where: { ma_gv: String(ma_gv) },
                    defaults: { 
                        ho: hoverGV, 
                        ten: tnGV,
                        sdt: sdt_gv, 
                        khoa_id: khoa.khoa_id,
                        email: `${String(ma_gv)}@utehy.edu.vn`
                    }
                });

                let ma_mon = ten_hocphan.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (!ma_mon) ma_mon = 'UNKNOWN';
                ma_mon += Math.random().toString(36).substring(2, 6).toUpperCase();
                
                const [mon_hoc] = await db.MonHoc.findOrCreate({
                    where: { ten_mon: ten_hocphan },
                    defaults: { ma_mon: ma_mon, sotinchi: 3, khoa_id: khoa.khoa_id }
                });

                for (const ma_lop of ma_lophocphans) {
                    const [lop_hoc_phan] = await db.LopHocPhan.findOrCreate({
                        where: { ma_lop: ma_lop, monhoc_id: mon_hoc.monhoc_id },
                        defaults: {
                            ten_lophocphan: `${ten_hocphan} - ${ma_lop}`,
                            hocky_id: hocKy.hocky_id,
                            giangvien_id: giang_vien.giangvien_id,
                            phong: phong || '',
                            thu: thu,
                            tiet_bat_dau: tiet_bat_dau,
                            so_tiet: so_tiet,
                            tuan_hoc: JSON.stringify([tuan]),
                            loai_hoc_phan: tchat === 'TH' ? 'TH' : 'LT'
                        }
                    });

                    // append tuan to tuan_hoc if missing
                    let tuans = [];
                    try { 
                        tuans = JSON.parse(lop_hoc_phan.tuan_hoc);
                        if (!Array.isArray(tuans)) tuans = [];
                    } catch(e){}
                    
                    if (!tuans.includes(tuan)) {
                        tuans.push(tuan);
                        lop_hoc_phan.tuan_hoc = JSON.stringify(tuans.sort((a,b)=>a-b));
                        await lop_hoc_phan.save();
                    }

                    // Create BuoiHoc
                    try {
                        const startOfSemester = dayjs('2025-07-28'); 
                        const thuOffset = thu === 8 ? 6 : (thu - 2); 
                        const ngay_hoc = startOfSemester.add(tuan - 1, 'week').add(thuOffset, 'day').format('YYYY-MM-DD');

                        await db.BuoiHoc.findOrCreate({
                            where: {
                                lophocphan_id: lop_hoc_phan.lophocphan_id,
                                ngay: ngay_hoc
                            },
                            defaults: {
                                tiet_bat_dau: tiet_bat_dau,
                                so_tiet: so_tiet,
                                phong: phong || '',
                                trangthai: 'scheduled'
                            }
                        });
                    } catch (e) {
                        // ignore constraint
                    }
                }
            }
        }
    };

    await processSchedule(cnpmFile);
    await processSchedule(khmtFile);
    console.log('Schedule CSVs processed.');

    // Process students
    console.log('Reading Student CSV...');
    if (fs.existsSync(studentFile)) {
        const workbook = xlsx.readFile(studentFile, { type: 'file' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        
        let startParsing = false;
        let lhp_id = null;

        // Ensure prerequisite
        const [mon_hoc] = await db.MonHoc.findOrCreate({
            where: { ten_mon: 'Thiết kế web cơ bản (2+1*)' },
            defaults: { ma_mon: 'TKWEBDC', sotinchi: 3, khoa_id: khoa.khoa_id }
        });
        const [giang_vien] = await db.GiangVien.findOrCreate({
            where: { ma_gv: '1218' },
            defaults: { ho: 'NGUYỄN VĂN', ten: 'QUYẾT', khoa_id: khoa.khoa_id, email: '1218@utehy.edu.vn' }
        });
        
        const [lop_hoc_phan] = await db.LopHocPhan.findOrCreate({
            where: { ma_lop: '221129' },
            defaults: {
                ten_lophocphan: 'Thiết kế web cơ bản (2+1*) - 221129',
                hocky_id: hocKy.hocky_id,
                monhoc_id: mon_hoc.monhoc_id,
                giangvien_id: giang_vien.giangvien_id,
                tuan_hoc: '[]',
                so_tiet: 3,
                thu: 2,
                tiet_bat_dau: 1
            }
        });
        lhp_id = lop_hoc_phan.lophocphan_id;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const firstCell = String(row[0] || '').trim();
            if (firstCell === 'TT' || firstCell === 'Số TT') {
                startParsing = true;
                continue;
            }

            if (startParsing && firstCell && !isNaN(parseInt(firstCell))) {
                const ma_sv = String(row[1] || '').trim();
                const ten_sv = String(row[2] || '').trim();
                const lop_sv = String(row[3] || '').trim();
                const ngay_sinh_raw = String(row[4] || '').trim();
                const sdt = String(row[6] || '').trim();

                if (!ma_sv) continue;

                const [lhc] = await db.LopHanhChinh.findOrCreate({
                    where: { ten_lop: lop_sv },
                    defaults: { khoa_id: khoa.khoa_id }
                });

                // parse date DD/MM/YYYY
                let ngay_sinh = null;
                if (ngay_sinh_raw) {
                    const parts = ngay_sinh_raw.split('/');
                    if (parts.length >= 3) {
                        ngay_sinh = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }

                try {
                    const [sinh_vien] = await db.SinhVien.findOrCreate({
                        where: { ma_sv: ma_sv },
                        defaults: {
                            ten: ten_sv,
                            lop_hanhchinh_id: lhc.lop_hanhchinh_id,
                            sdt: sdt,
                            ngaysinh: ngay_sinh || '2005-01-01',
                            email: `${ma_sv}@student.utehy.edu.vn`
                        }
                    });

                    await db.DangKyHoc.findOrCreate({
                        where: { sinhvien_id: sinh_vien.sinhvien_id, lophocphan_id: lhp_id }
                    });
                } catch(e) {
                    // ignore row on fail
                }
            }
        }
        console.log('Student CSV processed.');
    } else {
        console.log('Student CSV not found');
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedData();
