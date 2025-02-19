
import multer from 'multer'
import path from 'node:path'

const storage = multer.memoryStorage()
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato no soportado'));
  }
}


export const upload = multer({
  storage,
  limits: { fieldSize: 5 * 1024 * 1024 },
  fileFilter,
  
}
)