const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config')

const booksCtrl = require('../controllers/book');

router.get('/', booksCtrl.getAllBooks); // obtenir tous les livres //
router.post('/', auth, multer, booksCtrl.createBook); // Créer livre //
router.get('/:id', booksCtrl.getOneBook); // obtenir un livre
router.put('/:id', auth, multer, booksCtrl.modifyBook); // Mise à jour modif livre //
router.delete('/:id', auth, booksCtrl.deleteBook); // Supprimer un livre //

module.exports = router;