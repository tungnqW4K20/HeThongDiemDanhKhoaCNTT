'use strict';
import axiosClient from './axiosClient';

const dashboardService = {
  getOverview(filter = 'week', year, month) {
    let url = `/thong-ke/overview?filter=${filter}`;
    if (year)  url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return axiosClient.get(url);
  },

  getChartData(filter, year, month) {
    let url = `/thong-ke/chart?filter=${filter}`;
    if (year)  url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return axiosClient.get(url);
  }
};

export default dashboardService;