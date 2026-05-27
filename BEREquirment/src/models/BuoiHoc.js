// 'use strict';
// const { Model } = require('sequelize');

// module.exports = (sequelize, DataTypes) => {
//   class BuoiHoc extends Model {
//     static associate(models) {
//       BuoiHoc.belongsTo(models.LopHocPhan, { foreignKey: 'lophocphan_id', as: 'LopHocPhan' });
//       BuoiHoc.hasMany(models.DiemDanh, { foreignKey: 'buoi_id', as: 'DanhSachDiemDanh' });
//       BuoiHoc.belongsTo(models.GiangVien, { foreignKey: 'giangvien_day_thay_id', as: 'GVDayThay' });
//     }
//   }
//   BuoiHoc.init({
//     buoi_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
//     lophocphan_id: { type: DataTypes.UUID, allowNull: false },
//     ngay: { type: DataTypes.DATEONLY, allowNull: false },
//     trangthai: { 
//       type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'), 
//       defaultValue: 'scheduled' 
//     },
    
//     // Ghi nhận biến cố
//     is_override: { type: DataTypes.BOOLEAN, defaultValue: false },
//     phong_thay_doi: { type: DataTypes.STRING(50) },
//     ghi_chu: { type: DataTypes.STRING(255) },
//     // Ghi nhận Audit Log cho hàm luuDiemDanh
//     nguoi_tao: { type: DataTypes.UUID }, // ID của Giảng viên/Admin thực hiện điểm danh
//     batdau: { type: DataTypes.DATE } ,

//     giangvien_day_thay_id: {
//   type: DataTypes.UUID,
//   allowNull: true,
//   references: { model: 'GiangVien', key: 'giangvien_id' }
// },    // Thời điểm bắt đầu điểm danh thực tế
//   },



  
//   {
//     sequelize,
//     modelName: 'BuoiHoc',
//     tableName: 'BuoiHoc',
//     timestamps: false,
//     indexes: [
//         // BẮT BUỘC: Đảm bảo 1 lớp không thể có 2 bản ghi trong cùng 1 ngày
//         { unique: true, fields: ['lophocphan_id', 'ngay'] },
//         { fields: ['ngay'] }
//     ]
//   });
//   return BuoiHoc;
// };

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BuoiHoc extends Model {
    static associate(models) {
      BuoiHoc.belongsTo(models.LopHocPhan, { foreignKey: 'lophocphan_id', as: 'LopHocPhan' });
      BuoiHoc.hasMany(models.DiemDanh, { foreignKey: 'buoi_id', as: 'DanhSachDiemDanh' });
      BuoiHoc.belongsTo(models.GiangVien, { foreignKey: 'giangvien_day_thay_id', as: 'GVDayThay' });
    }
  }
  BuoiHoc.init({
    buoi_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    lophocphan_id: { type: DataTypes.UUID, allowNull: false },
    ngay: { type: DataTypes.DATEONLY, allowNull: false },
    trangthai: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    // Ghi nhận biến cố
    is_override: { type: DataTypes.BOOLEAN, defaultValue: false },
    phong_thay_doi: { type: DataTypes.STRING(50) },
    ghi_chu: { type: DataTypes.STRING(255) },
    // Ghi nhận Audit Log cho hàm luuDiemDanh
    nguoi_tao: { type: DataTypes.UUID }, // ID của Giảng viên/Admin thực hiện điểm danh
    batdau: { type: DataTypes.DATE },
    giangvien_day_thay_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'GiangVien', key: 'giangvien_id' }
    },
    // // Thông tin tiết học cho buổi học cụ thể
     tiet_bat_dau: { type: DataTypes.INTEGER, allowNull: true },
     so_tiet: { type: DataTypes.INTEGER, allowNull: true },
     phong: { type: DataTypes.STRING(50), allowNull: true } 
  },





    {
      sequelize,
      modelName: 'BuoiHoc',
      tableName: 'buoihoc',
      timestamps: false,
      indexes: [
        // BẮT BUỘC: Đảm bảo 1 lớp không thể có 2 bản ghi trong cùng 1 ngày
        { unique: true, fields: ['lophocphan_id', 'ngay'] },
        { fields: ['ngay'] }
      ]
    });
  return BuoiHoc;
};