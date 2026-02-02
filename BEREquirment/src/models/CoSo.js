'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CoSo extends Model {
    static associate(models) {
      // Một cơ sở có nhiều lớp hành chính
      CoSo.hasMany(models.LopHanhChinh, {
        foreignKey: 'coso_id',
        as: 'DanhSachLopHanhChinh'
      });

      // Một cơ sở tổ chức nhiều lớp học phần
      CoSo.hasMany(models.LopHocPhan, {
        foreignKey: 'coso_id',
        as: 'DanhSachLopHocPhan'
      });
    }
  }

  CoSo.init(
    {
      coso_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      ten_coso: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      dia_chi: {
        type: DataTypes.STRING(255),
        allowNull: true
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
      modelName: 'CoSo',
      tableName: 'CoSo',
      timestamps: false
    }
  );

  return CoSo;
};

