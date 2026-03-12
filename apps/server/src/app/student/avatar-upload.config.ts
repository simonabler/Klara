import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const avatarUploadOptions = {
  storage: diskStorage({
    // Funktion statt String → wird erst beim Request ausgewertet,
    // wenn process.env bereits durch .env befüllt ist
    destination: (
      _req: any,
      _file: Express.Multer.File,
      cb: (error: Error | null, dest: string) => void,
    ) => {
      const dir = process.env.UPLOAD_DIR ?? './uploads/avatars';
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Nur JPEG, PNG und WebP sind erlaubt'), false);
    }
  },
};
