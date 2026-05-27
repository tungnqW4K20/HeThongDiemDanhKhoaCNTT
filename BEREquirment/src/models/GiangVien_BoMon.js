'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GiangVien_BoMon extends Model {
    static associate(models) {
      // Bảng trung gian không cần khai báo lại associate trừ khi có dữ liệu phức tạp
      // Quan hệ N-N được định nghĩa ở GiangVien và BoMon
    }
  }

  GiangVien_BoMon.init(
    {
      giangvien_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'GiangVien',
          key: 'giangvien_id'
        }
      },
      bomon_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'BoMon',
          key: 'bomon_id'
        }
      }
    },
    {
      sequelize,
      modelName: 'GiangVien_BoMon',
      tableName: 'giangvien_bomon',
      timestamps: false
    }
  );

  return GiangVien_BoMon;
};
