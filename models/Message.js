const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  sessionId: {
    type: String,
    required: true
  },

  role: {
    type: String,
    required: true
  },

  text: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Message", MessageSchema);