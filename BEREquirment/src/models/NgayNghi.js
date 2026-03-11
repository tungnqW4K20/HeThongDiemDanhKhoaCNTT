'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NgayNghi extends Model {}
  NgayNghi.init({
    ngay: { type: DataTypes.DATEONLY, primaryKey: true },
    mo_ta: DataTypes.STRING(200),
    loai: { type: DataTypes.ENUM('le', 'tet', 'khac'), defaultValue: 'le' }
  }, {
    sequelize,
    modelName: 'NgayNghi',
    tableName: 'NgayNghi',
    timestamps: false
  });
  return NgayNghi;
};