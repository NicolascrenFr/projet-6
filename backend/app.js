const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); // Charge les variables d'env

const bookRoutes = require('./routes/book');
const userRoutes = require('./routes/user');

// Création d'une application Express //
const app = express();

// Connexion à MongoDB //
mongoose.connect(process.env.MONGODB_URI,
  { useNewUrlParser: true,
    useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch(() => console.log('Connexion à MongoDB échouée !'));

//CORS//
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
  });

// Rend les données exploitables en JSON //
app.use(express.json());

// middleware pour les images //
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middlewares qui définissent les routes //
app.use('/api/books', bookRoutes);
app.use('/api/auth', userRoutes);

// Export de l'app pour le server //
module.exports = app;
