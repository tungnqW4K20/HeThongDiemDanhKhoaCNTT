'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiemDanh extends Model {
    static associate(models) {
      // Mỗi record điểm danh thuộc về 1 buổi học
      DiemDanh.belongsTo(models.BuoiHoc, {
        foreignKey: 'buoi_id',
        as: 'BuoiHoc'
      });

      // Mỗi record điểm danh thuộc về 1 sinh viên
      DiemDanh.belongsTo(models.SinhVien, {
        foreignKey: 'sinhvien_id',
        as: 'SinhVien'
      });

      // Mỗi record điểm danh liên kết trực tiếp tới Học kỳ để tối ưu hóa truy xuất phi chuẩn
      DiemDanh.belongsTo(models.HocKy, {
        foreignKey: 'hocky_id',
        as: 'HocKy'
      });
    }
  }

  DiemDanh.init(
    {
      diemdanh_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      buoi_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'BuoiHoc', key: 'buoi_id' },
        onDelete: 'CASCADE'
      },
      sinhvien_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'SinhVien', key: 'sinhvien_id' },
        onDelete: 'CASCADE'
      },
      hocky_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'HocKy', key: 'hocky_id' },
        onDelete: 'SET NULL'
      },
      trangthai: {
        type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
        allowNull: false
      },
      ghichu: {
        type: DataTypes.STRING(255)
      },
      thoigian_danhdau: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'DiemDanh',   // 👈 Quan trọng: trùng với models.DiemDanh
      tableName: 'DiemDanh',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['buoi_id', 'sinhvien_id']
        },
        {
          name: 'idx_diemdanh_sinhvien_hocky',
          fields: ['sinhvien_id', 'hocky_id']
        }
      ]
    }
  );

  return DiemDanh;
};
