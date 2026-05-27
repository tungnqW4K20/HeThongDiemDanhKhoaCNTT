'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NamHoc extends Model {
    static associate(models) {
      // Một năm học có nhiều học kỳ
      NamHoc.hasMany(models.HocKy, {
        foreignKey: 'namhoc_id',
        as: 'DanhSachHocKy'
      });
    }
  }
  NamHoc.init({
    namhoc_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ten_namhoc: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true // Ví dụ: "2024-2025"
    },
    ngay_batdau: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    ngay_ketthuc: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'NamHoc',
    tableName: 'namhoc',
    timestamps: false
  });
  return NamHoc;
};