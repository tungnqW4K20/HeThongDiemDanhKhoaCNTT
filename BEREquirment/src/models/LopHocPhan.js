'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LopHocPhan extends Model {
    static associate(models) {
      LopHocPhan.belongsTo(models.MonHoc, { foreignKey: 'monhoc_id' });
      LopHocPhan.belongsTo(models.GiangVien, { foreignKey: 'giangvien_id' });
      LopHocPhan.belongsTo(models.HocKy, { foreignKey: 'hocky_id' });
      LopHocPhan.hasMany(models.BuoiHoc, { foreignKey: 'lophocphan_id', as: 'DanhSachBuoiHoc' });
      LopHocPhan.belongsToMany(models.LopHanhChinh, {
        through: models.LHP_LHC,
        foreignKey: 'lophocphan_id',
        otherKey: 'lop_hanhchinh_id',
        as: 'DanhSachLopHanhChinh' // Alias này sẽ dùng trong include
      });
    }
  }
  LopHocPhan.init({
    lophocphan_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    monhoc_id: { type: DataTypes.UUID, allowNull: false },
    giangvien_id: { type: DataTypes.UUID, allowNull: false },
    hocky_id: { type: DataTypes.UUID, allowNull: false },
    ten_lophocphan: DataTypes.STRING(200),
        ma_lop: DataTypes.STRING(200), // Mã lớp (có thể nhiều lớp ghép: "12S23W.1 12S23W.2")

    phong: DataTypes.STRING(50),
    thu: { type: DataTypes.INTEGER, allowNull: false }, // 2, 3, 4, 5, 6, 7, 8
    tiet_bat_dau: { type: DataTypes.INTEGER, allowNull: false },
    so_tiet: { type: DataTypes.INTEGER, allowNull: false },
    // CHUYÊN GIA: Lưu mảng [1,2,3,4,5,7,8...] gộp từ Excel
    tuan_hoc: { type: DataTypes.JSON, allowNull: false },
    loai_hoc_phan: { 
      type: DataTypes.ENUM('LT', 'TH'), 
      defaultValue: 'LT' 
    }
  }, {
    sequelize,
    modelName: 'LopHocPhan',
    tableName: 'LopHocPhan',
    timestamps: false
  });
  return LopHocPhan;
};