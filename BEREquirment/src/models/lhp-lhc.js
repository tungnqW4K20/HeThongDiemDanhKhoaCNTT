'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LHP_LHC extends Model {
    static associate(models) {
      LHP_LHC.belongsTo(models.LopHocPhan, {
        foreignKey: 'lophocphan_id'
      });

      LHP_LHC.belongsTo(models.LopHanhChinh, {
        foreignKey: 'lop_hanhchinh_id',
        //  as: "DanhSachLopHanhChinh"
      });
    }
  }





  LHP_LHC.init(
    {
      lophocphan_id: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      lop_hanhchinh_id: {
        type: DataTypes.UUID,
        primaryKey: true
      }
    },
    {
      sequelize,
      modelName: 'LHP_LHC',
      tableName: 'LHP_LHC',
      timestamps: false
    }
  );

  return LHP_LHC;
};
