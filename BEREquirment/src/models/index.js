'use strict';

const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Import tường minh từng model (thay vì dùng fs.readdirSync để ncc bundle hoạt động đúng)
const modelDefiners = [
  require('./BoMon'),
  require('./BuoiHoc'),
  require('./ChuyenNganh'),
  require('./CoSo'),
  require('./DangKyHoc'),
  require('./DeXuatChinhSua'),
  require('./DiemDanh'),
  require('./GiangVien'),
  require('./GiangVien_BoMon'),
  require('./HocKy'),
  require('./Khoa'),
  require('./LopHanhChinh'),
  require('./LopHocPhan'),
  require('./MonHoc'),
  require('./NamHoc'),
  require('./NgayNghi'),
  require('./SinhVien'),
  require('./TaiKhoan'),
  require('./ThongBao'),
  require('./lhp-lhc'),
];

for (const modelDefiner of modelDefiners) {
  const model = modelDefiner(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;