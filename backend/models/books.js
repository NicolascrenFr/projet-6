const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  imageUrl: { type: String, required: true },
  year: { 
    type: Number, 
    required: true,
    min: 1900,
    max: new Date().getFullYear() 
  },
  genre: { type: String, required: true },
  ratings: [{
    userId: { 
      type: String, 
      required: true 
    },
    grade: { 
      type: Number, 
      required: true,
      min: 0,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0,
    max: 5
  }
});

// Méthode statique pour calculer la moyenne
bookSchema.statics.calculateAverage = async function(bookId) {
  const result = await this.aggregate([
    { $match: { _id: bookId } },
    { $unwind: '$ratings' },
    { 
      $group: {
        _id: '$_id',
        averageRating: { $avg: '$ratings.grade' }
      } 
    }
  ]);
  
  return result[0]?.averageRating || 0;
};

// Middleware pour mettre à jour la moyenne après modification
bookSchema.post('save', async function() {
  await this.constructor.updateAverage(this._id);
});

bookSchema.methods.updateAverage = async function() {
  const avg = await this.constructor.calculateAverage(this._id);
  await this.constructor.findByIdAndUpdate(this._id, 
    { averageRating: parseFloat(avg.toFixed(2)) });
};

module.exports = mongoose.model('Book', bookSchema);