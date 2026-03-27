'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GiangVien extends Model {
    static associate(models) {
      GiangVien.hasMany(models.LopHocPhan, {
        foreignKey: 'giangvien_id',
        as: 'DanhSachLopHocPhan'
      });

      GiangVien.hasOne(models.TaiKhoan, {
        foreignKey: 'ref_id',
        as: 'TaiKhoan'
      });
      GiangVien.belongsTo(models.Khoa, {
        foreignKey: 'khoa_id',
        as: 'Khoa'
      });
      GiangVien.hasMany(models.LopHanhChinh, {
          foreignKey: "giangvien_id",
          as: "DanhSachLopChuNhiem"
      });

    }
  }


  GiangVien.init(
    {
      giangvien_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      khoa_id: {
        type: DataTypes.UUID,
        allowNull: true 
      },
      ma_gv: {
        type: DataTypes.STRING(50),
        unique: true
      },
      ho: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      ten: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      email: DataTypes.STRING(150),
      sdt: DataTypes.STRING(50),
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Mặc định là chưa xóa
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'GiangVien',
      tableName: 'GiangVien',
      timestamps: false,
      
    }
  );

  return GiangVien;
};
