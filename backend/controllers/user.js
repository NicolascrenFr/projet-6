const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

// Regex amélioré
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir :\n- 8 caractères minimum\n- 1 majuscule\n- 1 chiffre\n- 1 caractère spécial'
      });
    }

    // Vérification email existant
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Création utilisateur
    const hash = await bcrypt.hash(password, 12); // Salt augmenté à 12
    const user = new User({ email, password: hash });
    await user.save();

    res.status(201).json({ message: 'Compte créé avec succès' });

  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' }); // Message générique pour la sécurité
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    res.status(200).json({
      userId: user._id,
      token: jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET, // Clé depuis .env
        { expiresIn: '72h' } // Durée de vie augmentée
      )
    });

  } catch (error) {
    res.status(500).json({ error: 'Connexion impossible' });
  }
};