'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MonHoc extends Model {
    static associate(models) {
      MonHoc.hasMany(models.LopHocPhan, {
        foreignKey: 'monhoc_id',
        as: 'DanhSachHocPhan'
      });
       MonHoc.belongsTo(models.Khoa, {
        foreignKey: 'khoa_id',
        as: 'Khoa'
      });
    }
  }

  MonHoc.init(
    {
      monhoc_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      khoa_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      ma_mon: {
        type: DataTypes.STRING(20),
        unique: true
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Mặc định là chưa xóa
        allowNull: false
      },
      ten_mon: DataTypes.STRING(255),
      sotinchi: DataTypes.INTEGER,
      mota: DataTypes.TEXT
    },
    {
      sequelize,
      modelName: 'MonHoc',
      tableName: 'MonHoc',
      timestamps: false
    }
  );

  return MonHoc;
};
