require('dotenv').config();
const corsMiddleware = require('./config/cors.config');
const express = require('express');
const path = require('path');
const db = require('./models');

const app = express();
const port = process.env.PORT || 3001;



const authRoutes = require('./routes/auth.routes');
const GiangVienRoutes = require('./routes/giangvien.routes');
const LopRoutes = require('./routes/lop.routes');
const QRRoutes = require('./routes/qr.routes');
const PhanCongRoutes = require('./routes/phancong.routes')
const HocKyRoutes = require('./routes/hocky.routes')
const LopHocPhanRoute = require('./routes/lophocphan.route')
const DiemDanhRoute = require('./routes/diemdanh.routes')
const KhoaRoute = require('./routes/khoa.routes')
const PhanCongAutoRoutes = require('./routes/phancong-auto.routes')
const SinhVienRoute = require('./routes/sinhvien.routes')

const MonHocRoute = require('./routes/monhoc.routes')
const CoSoRoute = require('./routes/coso.routes')
const DashboardRoute = require('./routes/dashboard.route')

const DeXuatRoute = require('./routes/dexuat.route')
const NamHocRoute = require('./routes/namhoc.routes')



app.use(corsMiddleware);
app.use(express.json()); 

db.sequelize.authenticate()
  .then(() => {
    console.log(' Kết nối MySQL thành công!');
    //return db.sequelize.sync(); 
    return db.sequelize.sync({ alter: true }); // thay đổi cấu trúc bảng
  })

  

  .then(() => {
    console.log('✅ Đồng bộ bảng thành công!');
    app.use('/api/auth', authRoutes);
    app.use('/api/giang-vien', GiangVienRoutes);
    app.use('/api/hoc-ky', HocKyRoutes);
    app.use('/api/lop', LopRoutes);
    app.use('/api/qr', QRRoutes);
    app.use('/api/phan-cong', PhanCongRoutes);
    app.use('/api/lop-hoc-phan', LopHocPhanRoute);
    app.use('/api/diem-danh', DiemDanhRoute);
    app.use('/api/khoa', KhoaRoute);
    app.use('/api/sinh-vien', SinhVienRoute);
    app.use('/api/phan-cong-auto', PhanCongAutoRoutes);
    app.use('/api/mon-hoc', MonHocRoute);
    app.use('/api/co-so', CoSoRoute);
     app.use('/api/thong-ke', DashboardRoute);
     app.use('/api/de-xuat', DeXuatRoute);
     app.use('/api/nam-hoc', NamHocRoute)


    


    app.listen(port, () => {
      console.log(` Server chạy tại http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error(' Lỗi khởi tạo:', err);
    process.exit(1);
  });

app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).send('Có lỗi xảy ra!');
});



