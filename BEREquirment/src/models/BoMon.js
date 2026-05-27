'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BoMon extends Model {
    static associate(models) {
      BoMon.belongsTo(models.Khoa, {
        foreignKey: 'khoa_id',
        as: 'Khoa'
      });

      BoMon.belongsTo(models.TaiKhoan, {
        foreignKey: 'truong_bomon_id',
        as: 'TruongBoMon'
      });

      BoMon.hasMany(models.MonHoc, {
        foreignKey: 'chuyennganh_id',
        sourceKey: 'bomon_id',
        as: 'DanhSachMonHoc',
        constraints: false
      });

      BoMon.belongsToMany(models.GiangVien, {
        through: models.GiangVien_BoMon,
        as: 'DanhSachGiangVien',
        foreignKey: 'bomon_id'
      });
    }
  }

  BoMon.init(
    {
      bomon_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      khoa_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      ma_bomon: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      ten_bomon: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      truong_bomon_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'TaiKhoan', key: 'taikhoan_id' }
      },
      mota: DataTypes.TEXT,
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'BoMon',
      tableName: 'bomon',
      timestamps: false
    }
  );

  return BoMon;
};