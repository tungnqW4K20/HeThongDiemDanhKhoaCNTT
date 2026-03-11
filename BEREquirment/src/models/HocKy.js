'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HocKy extends Model {
    static associate(models) {
      HocKy.belongsTo(models.NamHoc, { foreignKey: 'namhoc_id', as: 'NamHoc' }); 
      HocKy.hasMany(models.LopHocPhan, { foreignKey: 'hocky_id', as: 'DanhSachHocPhan' });
    }
  }
  HocKy.init({
    hocky_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ten_hocky: DataTypes.STRING(100),
    ngay_batdau: { type: DataTypes.DATEONLY, allowNull: false },
    ngay_ketthuc: { type: DataTypes.DATEONLY, allowNull: false },
    // QUAN TRỌNG: Ngày Thứ 2 của tuần số 1. Mọi phép tính lịch đều dựa vào đây.
    ngay_monday_tuan_1: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      comment: 'Ngày Thứ 2 của tuần đầu tiên học kỳ' 
    },
    namhoc_id: { 
      type: DataTypes.UUID, 
      allowNull: true,
      references: { model: 'NamHoc', key: 'namhoc_id' }
    },
    tuan_bat_dau_co_lich: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Tuần đầu tiên có lịch dạy (null = bắt đầu từ tuần 1)'
    },
  }, {
    sequelize,
    modelName: 'HocKy',
    tableName: 'HocKy',
    timestamps: false
  });
  return HocKy;
};