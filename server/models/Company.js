const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    website: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['MNC', 'Startup', 'Product Company', 'Service Company', 'Other'],
      required: true,
    },
    location: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    logo: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
