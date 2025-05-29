const Book = require('../models/books');
const fs = require('fs');

// Helper pour la gestion des fichiers
const deleteImage = (filename) => {
  if (filename) {
    fs.unlink(`images/${filename}`, (err) => {
      if (err) console.error('Erreur suppression image:', err);
    });
  }
};

// Création d'un livre
// exports.createBook = async (req, res) => {
//   try {
//     // Validation obligatoire de l'image
//     if (!req?.file?.filename) {
//       return res.status(400).json({ message: 'Fichier image manquant' });
//     }

//     const bookObject = JSON.parse(req.body.book);
//     delete bookObject._id;
//     delete bookObject._userId;

//     const book = new Book({
//       ...bookObject,
//       userId: req.auth.userId,
//       imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
//       averageRating: 0 // Initialisation
//     });

//     await book.save();
//     res.status(201).json({ message: 'Livre enregistré !', book });

//   } catch (error) {
//     // Nettoyage en cas d'erreur
//     if (req.file) deleteImage(req.file.filename);
    
//     res.status(400).json({ 
//       message: error instanceof SyntaxError 
//         ? 'Données JSON invalides' 
//         : 'Erreur lors de la création',
//       error: error.message 
//     });
//   }
// };

exports.createBook = async (req, res) => {
  try {
    // 1. Validation minimale
    if (!req.file || !req.body.book) {
      if (req.file) fs.unlinkSync(`images/${req.file.filename}`);
      return res.status(400).json({ error: "Données incomplètes" });
    }

    // 2. Parse des données
    const bookData = JSON.parse(req.body.book);
    
    // 3. Formatage des données pour correspondre au frontend
    const book = new Book({
      ...bookData,
      _id: undefined, // Permet à MongoDB de générer un nouvel ID
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
      ratings: bookData.ratings || [], // Garde les ratings existants ou initialise
      averageRating: bookData.averageRating || 0 // Garde la note existante ou 0
    });

    // 4. Sauvegarde
    const savedBook = await book.save();

    // 5. Réponse formatée comme attendu par le frontend
    res.status(201).json({
      message: 'Livre enregistré !',
      book: {
        ...savedBook.toObject(),
        id: savedBook._id, // Conversion _id vers id
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
      }
    });

  } catch (error) {
    // Nettoyage et erreur
    if (req.file) fs.unlinkSync(`images/${req.file.filename}`);
    res.status(400).json({ 
      error: error.message,
      receivedData: { // Pour debug
        body: req.body,
        file: req.file ? true : false
      }
    });
  }
};

// Modification (version sécurisée)
exports.modifyBook = async (req, res) => {
  try {
    let bookObject;
    let oldImageName;

    // Récupération du livre existant
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre non trouvé' });

    // Vérification des droits
    if (book.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    // Préparation des données
    if (req.file) {
      bookObject = {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
      };
      oldImageName = book.imageUrl.split('/images/')[1];
    } else {
      bookObject = { ...req.body };
    }

    delete bookObject._userId;

    // Mise à jour
    await Book.updateOne(
      { _id: req.params.id }, 
      { ...bookObject, _id: req.params.id }
    );

    // Nettoyage ancienne image si nouvelle image uploadée
    if (req.file && oldImageName) {
      deleteImage(oldImageName);
    }

    res.status(200).json({ message: 'Livre modifié !' });

  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    res.status(400).json({ 
      message: 'Échec de la modification',
      error: error.message 
    });
  }
};

// Suppression
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre non trouvé' });

    if (book.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    const filename = book.imageUrl.split('/images/')[1];
    
    await Promise.all([
      Book.deleteOne({ _id: req.params.id }),
      new Promise((resolve) => {
        deleteImage(filename);
        resolve();
      })
    ]);

    res.status(200).json({ message: 'Livre supprimé !' });

  } catch (error) {
    res.status(500).json({ 
      message: 'Échec de la suppression',
      error: error.message 
    });
  }
};

// Récupération des livres
exports.getOneBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre non trouvé' });
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json({ 
      message: 'Requête invalide',
      error: error.message 
    });
  }
};

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find()
      .select('title author imageUrl averageRating year'); // Optimisation bande passante
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ 
      message: 'Échec de la récupération',
      error: error.message 
    });
  }
};

// Notation
exports.rateBook = async (req, res) => {
  try {
    const { rating } = req.body;
    const userId = req.auth.userId;

    // Validation
    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être entre 0 et 5' });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre non trouvé' });

    // Vérification double notation
    if (book.ratings.some(r => r.userId.toString() === userId)) {
      return res.status(400).json({ message: 'Vous avez déjà noté ce livre' });
    }

    // Ajout de la note
    book.ratings.push({ userId, grade: rating });

    // Calcul moyenne optimisé
    const sum = book.ratings.reduce((acc, r) => acc + r.grade, 0);
    book.averageRating = parseFloat((sum / book.ratings.length).toFixed(2));

    await book.save();
    res.status(201).json(book);

  } catch (error) {
    res.status(500).json({ 
      message: 'Échec de la notation',
      error: error.message 
    });
  }
};

// Top 3 livres 
exports.getBestRatedBooks = async (req, res) => {
  try {
    const bestBooks = await Book.find()
      .sort({ averageRating: -1 })
      .limit(3)
      .select('title author imageUrl averageRating'); // Champs essentiels seulement

    res.status(200).json(bestBooks);
  } catch (error) {
    res.status(400).json({ 
      message: 'Échec de la récupération',
      error: error.message 
    });
  }
};