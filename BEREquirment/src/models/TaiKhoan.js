'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaiKhoan extends Model {
    static associate(models) {
      TaiKhoan.hasMany(models.BuoiHoc, {
        foreignKey: 'nguoi_tao',
        as: 'BuoiHocDaTao'
      });

      TaiKhoan.belongsTo(models.GiangVien, {
        foreignKey: 'ref_id',
        constraints: false,
        as: 'GiangVien'
      });
    }
  }

  TaiKhoan.init(
    {
      taikhoan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      vaitro: {
        type: DataTypes.ENUM('admin', 'giangvien'),
        allowNull: false
      },
      ref_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'TaiKhoan',
      tableName: 'TaiKhoan',
      timestamps: false
    }
  );

  return TaiKhoan;
};
