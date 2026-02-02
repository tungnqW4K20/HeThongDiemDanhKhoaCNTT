'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SinhVien extends Model {
    static associate(models) {
      SinhVien.belongsTo(models.LopHanhChinh, {
        foreignKey: 'lop_hanhchinh_id',
        as: 'Lop'
      });

      SinhVien.hasMany(models.DangKyHoc, {
        foreignKey: 'sinhvien_id',
        as: 'DangKy'
      });

      SinhVien.hasMany(models.DiemDanh, {
        foreignKey: 'sinhvien_id',
        as: 'DanhSachDiemDanh'
      });
    }
  }

  SinhVien.init(
    {
      sinhvien_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      ma_sv: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
      },
      ten: DataTypes.STRING(100),
      email: DataTypes.STRING(150),
      sdt: DataTypes.STRING(50),
      lop_hanhchinh_id: DataTypes.UUID,
      ngaysinh: DataTypes.DATEONLY,
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, 
        allowNull: false
      },
      trang_thai: {
        type: DataTypes.ENUM('Đang học', 'Cảnh báo', 'Bảo lưu', 'Thôi học'),
        allowNull: true,
        defaultValue: null
      }
    },
    {
      sequelize,
      modelName: 'SinhVien',
      tableName: 'SinhVien',
      timestamps: false
    }
  );

  return SinhVien;
};
