import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { INVALID_IMAGE_MESSAGE } from './avatar-storage.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const avatarUploadOptions = {
  // Datei bleibt im Speicher – geprüft und gespeichert wird im AvatarStorageService
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  // Nur Vorfilter: den MIME-Typ setzt der Client selbst, er ist keine Sicherheitsgrenze.
  // Entscheidend ist die Inhaltsprüfung mit sharp.
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
  ) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(INVALID_IMAGE_MESSAGE), false);
    }
  },
};
