import { Request } from 'express';
import multer from 'multer';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf'];


const storage = multer.memoryStorage();

// Per-field max size (bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  profile_image: 1 * 1024 * 1024,
  pages: 2 * 1024 * 1024,
  pdf: 5 * 1024 * 1024,
};

export const MAX_FILE_COUNTS: Record<string, number> = {
  profile_image: 1,
  pages: 30,
  pdf: 1
};

const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
  const allowedFieldnames = Object.keys(MAX_FILE_SIZES);
  console.log(file)
  // Field validation
  if (!allowedFieldnames.includes(file.fieldname)) {
    return cb(new Error(`Invalid fieldname: ${file.fieldname}`));
  }

  // Image-only validation (including driving_license)
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    const allowedFormats = IMAGE_MIME_TYPES.map((type) => type?.split('/')[1]).join(', ');
    return cb(new Error(`${file.fieldname} must be an image file: ${allowedFormats}`));
  }

  if (file.fieldname === 'csv_file') {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error(`csv_file must be a CSV file`));
    }
  }

  // Per-file size validation
  const maxSize = MAX_FILE_SIZES[file.fieldname];
  if (file.size > maxSize) {
    return cb(new Error(`${file.fieldname} exceeds the size limit of ${maxSize / (1024 * 1024)}MB`));
  }

  cb(null, true);
};

export const uploadFile = () =>
  multer({
    storage,
    fileFilter,
  }).fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'pages', maxCount: 60 },
    { name: 'pdf', maxCount: 1 },
  ]);
