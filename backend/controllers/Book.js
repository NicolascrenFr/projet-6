const Book = require('../models/books');
const fs = require('fs');

// Création d'un livre //
exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  // ne pas faire confiance aux clients //
  delete bookObject._userId;
  const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  book.save()
  .then(() => { res.status(201).json({message: 'Livre enregistré !'})})
  .catch(error => { res.status(400).json( { error })})
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({
    _id: req.params.id
  }).then(
    (book) => {
      res.status(200).json(book);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.modifyBook = (req, res, next) => {
  console.log("User ID from token:", req.auth.userId); // Debug
  
  const bookObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  Book.findOne({ _id: req.params.id })
    .then(book => {
      console.log("Book owner ID:", book.userId); // Debug
      
      if (book.userId != req.auth.userId) {
        return res.status(401).json({ message: 'Non autorisé : userId ne correspond pas' });
      }
      
      Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
        .then(() => res.status(200).json({ message: 'Livre modifié !' }))
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(400).json({ error }));
};

// Suppression d'un livre //
exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
      .then(book => {
          if (book.userId != req.auth.userId) { // Vérification si l'user est bien le même que l'auth //
              res.status(401).json({message: 'Non-autorisé'});
          } else {
              const filename = book.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => { // fs.unlink est l'action qui supprime le fichier et envoit un callback pour supprimer dans la database //
                  Book.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Livre supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};

// Récupération de tous les livres //
exports.getAllBooks = (req, res, next) => {
  console.log('Appel de getAllBooks');
  Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(404).json({error}));
};