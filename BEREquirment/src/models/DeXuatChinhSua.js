'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeXuatChinhSua extends Model {
    static associate(models) {
      // Đề xuất thuộc về một buổi học cụ thể
      DeXuatChinhSua.belongsTo(models.BuoiHoc, {
        foreignKey: 'buoi_id',
        as: 'BuoiHoc'
      });

      // Đề xuất được gửi bởi một giảng viên
      DeXuatChinhSua.belongsTo(models.GiangVien, {
        foreignKey: 'nguoi_de_xuat_id',
        as: 'NguoiDeXuat'
      });

      // (Tùy chọn) Liên kết với Admin người duyệt
      DeXuatChinhSua.belongsTo(models.TaiKhoan, {
        foreignKey: 'nguoi_duyet_id',
        as: 'AdminDuyet'
      });

      
    }
  }

  DeXuatChinhSua.init({
    dexuat_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    buoi_id: { type: DataTypes.UUID, allowNull: false },
    nguoi_de_xuat_id: { type: DataTypes.UUID, allowNull: false },
    ngay_moi: DataTypes.DATEONLY,
    tiet_bat_dau_moi: DataTypes.INTEGER,
    so_tiet_moi: DataTypes.INTEGER,
    phong_moi: DataTypes.STRING,
    giangvien_day_thay_moi_id: DataTypes.UUID,
    ly_do: DataTypes.TEXT,
    loai_de_xuat: {
      type: DataTypes.ENUM('chinh_sua', 'mo_lai'),
      defaultValue: 'chinh_sua',
      comment: 'chinh_sua = sửa lịch, mo_lai = yêu cầu mở lại buổi học để điểm danh'
    },
    trang_thai: { 
      type: DataTypes.ENUM('pending', 'approved', 'rejected'), 
      defaultValue: 'pending' 
    },
    phan_hoi_admin: DataTypes.TEXT,
    nguoi_duyet_id: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'DeXuatChinhSua',
    tableName: 'DeXuatChinhSua',
    timestamps: true // Để biết yêu cầu gửi lúc nào
  });

  return DeXuatChinhSua;
};