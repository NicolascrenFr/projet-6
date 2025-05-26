const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

// Configuration du stockage Multer (en mémoire)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // verifie que le MIME est autorisé //
    const isValid = MIME_TYPES[file.mimetype];
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  }
}).single('image');

// Middleware de traitement d'image
const processImage = async (req, res, next) => {
  // Si pas de fichier, on passe au middleware suivant
  if (!req.file) {
    return next();
  }

  try {
    // Créer le dossier 'images' s'il n'existe pas
    if (!fs.existsSync('./images')) {
      fs.mkdirSync('./images');
    }

    // Préparation du nom de fichier
    const timestamp = Date.now();
    const originalName = req.file.originalname.replace(/\s+/g, '_');
    const fileName = `${originalName.split('.')[0]}_${timestamp}.webp`;

    // Conversion en WebP avec qualité à 80%
    await sharp(req.file.buffer)
      .webp({ quality: 80 })
      .toFile(`./images/${fileName}`);

    // Ajout des informations de l'image traitée à la requête
    req.processedImage = {
      path: `./images/${fileName}`,
      filename: fileName,
      url: `/images/${fileName}`
    };

    next();
  } catch (error) {
    console.error("Erreur de traitement d'image:", error);
    return res.status(500).json({ error: "Erreur lors du traitement de l'image" });
  }
};

// Exportation du middleware combiné
module.exports = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return next();
    }

    try {
      if (!fs.existsSync('./images')) {
        fs.mkdirSync('./images');
      }

      const timestamp = Date.now();
      const originalName = req.file.originalname.replace(/\s+/g, '_');
      const fileName = `${originalName.split('.')[0]}_${timestamp}.webp`;

      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(`./images/${fileName}`);

      req.file.filename = fileName;
      next();
    } catch (error) {
      return res.status(500).json({ error: "Erreur de traitement de l'image" });
    }
  });
};