const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

// Configuration Multer améliorée
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Formats acceptés: JPG, PNG, WebP'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5MB
}).single('image');

module.exports = async (req, res, next) => {
  try {
    // Gestion upload
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    if (!req.file) return next();

    // Création dossier si inexistant
    if (!fs.existsSync('images')) {
      fs.mkdirSync('images', { recursive: true });
    }

    // Génération nom de fichier sécurisé
    const sanitizedName = req.file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '');
    
    const fileName = `${path.parse(sanitizedName).name}_${Date.now()}.webp`;
    const outputPath = path.join('images', fileName);

    // Conversion image
    await sharp(req.file.buffer)
      .webp({ 
        quality: 80,
        lossless: false 
      })
      .toFile(outputPath);

    // Ajout infos à la requête
    req.file = {
      ...req.file,
      path: outputPath,
      filename: fileName,
      webpUrl: `/images/${fileName}`
    };

    next();
  } catch (error) {
    // Nettoyage en cas d'erreur
    if (req.file?.filename) {
      fs.unlink(path.join('images', req.file.filename), () => {});
    }
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
       .json({ 
         error: error.message.includes('Type de fichier') 
           ? error.message 
           : 'Erreur de traitement de l\'image' 
       });
  }
};