'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChuyenNganh extends Model {
    static associate(models) {
      ChuyenNganh.belongsTo(models.Khoa, {
        foreignKey: 'khoa_id',
        as: 'Khoa'
      });

      ChuyenNganh.belongsTo(models.GiangVien, {
        foreignKey: 'truong_bomon_id',
        as: 'TruongBoMon'
      });

      ChuyenNganh.hasMany(models.LopHanhChinh, {
        foreignKey: 'chuyennganh_id',
        as: 'DanhSachLopHanhChinh'
      });

      ChuyenNganh.hasMany(models.MonHoc, {
        foreignKey: 'chuyennganh_id',
        as: 'DanhSachMonHoc'
      });
    }
  }

  ChuyenNganh.init(
    {
      chuyennganh_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      khoa_id: {
        type: DataTypes.UUID,
        allowNull: false, 
        references: { model: 'Khoa', key: 'khoa_id' }
      },
      ma_chuyennganh: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
      },
      ten_chuyennganh: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      truong_bomon_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'GiangVien', key: 'giangvien_id' }
      },
      mota: DataTypes.TEXT,
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'ChuyenNganh',
      tableName: 'ChuyenNganh',
      timestamps: false
    }
  );

  return ChuyenNganh;
};