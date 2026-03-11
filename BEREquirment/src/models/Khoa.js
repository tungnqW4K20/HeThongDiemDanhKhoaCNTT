'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Khoa extends Model {
    static associate(models) {
      Khoa.hasMany(models.GiangVien, {
        foreignKey: 'khoa_id',
        as: 'DanhSachGiangVien'
      });

      Khoa.hasMany(models.LopHanhChinh, {
        foreignKey: 'khoa_id',
        as: 'DanhSachLopHanhChinh'
      });

      Khoa.hasMany(models.MonHoc, {
        foreignKey: 'khoa_id',
        as: 'DanhSachMonHoc'
      });
      Khoa.hasMany(models.ChuyenNganh, {
        foreignKey: 'khoa_id',
        as: 'DanhSachChuyenNganh'
      });
    }
  }

  Khoa.init(
    {
      khoa_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      ma_khoa: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
      },
      ten_khoa: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      mota: DataTypes.TEXT,
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Mặc định là chưa xóa
        allowNull: false
      },
      
    },
    {
      sequelize,
      modelName: 'Khoa',
      tableName: 'Khoa',
      timestamps: false,
      
    }
  );

  return Khoa;
};