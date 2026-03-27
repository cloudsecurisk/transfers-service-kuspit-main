import multer from 'multer'

// Use memoryStorage to avoid storing junk on the server disk.
// The file lives in RAM only during the request.
const storage = multer.memoryStorage()

export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit (Adjust)
  },
})
