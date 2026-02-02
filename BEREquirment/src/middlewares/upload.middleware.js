const multer = require('multer');


const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ];

  const validExt = /\.(xlsx|xls|csv)$/i.test(file.originalname);

  if (allowedMimeTypes.includes(file.mimetype) || validExt) {
    return cb(null, true);
  }

  return cb(new Error('Định dạng file không hợp lệ. Chỉ chấp nhận .xlsx, .xls, .csv'), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 
  }
});

module.exports = upload;