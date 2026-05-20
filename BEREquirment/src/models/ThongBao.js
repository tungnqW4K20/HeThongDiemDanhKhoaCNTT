'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ThongBao extends Model {
    static associate(models) {
      ThongBao.belongsTo(models.TaiKhoan, {
        foreignKey: 'nguoi_nhan_id',
        as: 'NguoiNhan'
      });
    }
  }

  ThongBao.init(
    {
      thongbao_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      nguoi_nhan_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tieude: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      noidung: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      loai_thong_bao: {
        type: DataTypes.STRING(50), // 'canh_bao_sinh_vien', 'he_thong'
        allowNull: false,
        defaultValue: 'he_thong'
      },
      metadata: {
        type: DataTypes.TEXT, // JSON serialized text
        allowNull: true
      },
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'ThongBao',
      tableName: 'ThongBao',
      timestamps: false
    }
  );

  return ThongBao;
};
