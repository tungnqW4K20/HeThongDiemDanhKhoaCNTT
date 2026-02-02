'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LopHanhChinh extends Model {
    static associate(models) {
      LopHanhChinh.hasMany(models.SinhVien, {
        foreignKey: 'lop_hanhchinh_id',
        as: 'DanhSachSinhVien'
      });

      LopHanhChinh.belongsTo(models.Khoa, {
        foreignKey: 'khoa_id',
        as: 'Khoa'
      });

      LopHanhChinh.belongsTo(models.GiangVien, {
        foreignKey: 'giangvien_id',
        as: 'GVCN'
      });

      // Quan hệ N-N với LopHocPhan
      LopHanhChinh.belongsToMany(models.LopHocPhan, {
        through: models.LHP_LHC,
        foreignKey: 'lop_hanhchinh_id',
        otherKey: 'lophocphan_id',
        as: 'DanhSachLopHocPhan'
      });
       LopHanhChinh.belongsTo(models.CoSo, {
        foreignKey: 'coso_id',
        as: 'CoSo'
      });

      LopHanhChinh.belongsTo(models.ChuyenNganh, {
        foreignKey: 'chuyennganh_id',
        as: 'ChuyenNganh'
      });
      
    }
  }

  LopHanhChinh.init(
    {
      lop_hanhchinh_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      khoa_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      ten_lop: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      nien_khoa: DataTypes.INTEGER,
      chuong_trinh: DataTypes.STRING(100),
      ghichu: DataTypes.TEXT,
      ngay_tao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      giangvien_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      coso_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'CoSo', key: 'coso_id' }
      },
      chuyennganh_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ChuyenNganh', key: 'chuyennganh_id' }
      },
    },
    {
      sequelize,
      modelName: 'LopHanhChinh',
      tableName: 'LopHanhChinh',
      timestamps: false
    }
  );

  return LopHanhChinh;
};
