'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DangKyHoc extends Model {
    static associate(models) {
      DangKyHoc.belongsTo(models.SinhVien, { foreignKey: 'sinhvien_id' });
      DangKyHoc.belongsTo(models.LopHocPhan, { foreignKey: 'lophocphan_id' });
    }
  }

  DangKyHoc.init(
    {
      dangky_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      sinhvien_id: DataTypes.UUID,
      lophocphan_id: DataTypes.UUID,
      ngay_dangky: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      trangthai: {
        type: DataTypes.ENUM('active', 'left', 'suspended'),
        defaultValue: 'active'
      }
    },
    {
      sequelize,
      modelName: 'DangKyHoc',
      tableName: 'DangKyHoc',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['sinhvien_id', 'lophocphan_id'] }
      ]
    }
  );

  return DangKyHoc;
};
