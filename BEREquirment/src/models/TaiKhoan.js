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

      TaiKhoan.hasMany(models.BoMon, {
        foreignKey: 'truong_bomon_id',
        as: 'DanhSachBoMonQuanLy'
      });
      
      TaiKhoan.hasOne(models.Khoa, {
        foreignKey: 'lanh_dao_id',
        as: 'KhoaQuanLy'
      });

      TaiKhoan.hasMany(models.ThongBao, {
        foreignKey: 'nguoi_nhan_id',
        as: 'DanhSachThongBao'
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
        type: DataTypes.ENUM('admin', 'giangvien', 'lanhdao', 'truongbomon'),
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
      tableName: 'taikhoan',
      timestamps: false
    }
  );

  return TaiKhoan;
};
