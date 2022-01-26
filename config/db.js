const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri, {
      useUnifiedTopology: true,
      useCreateIndex: true,
      useNewUrlParser: true,
    });
    const connection = mongoose.connection;
    console.log('connected to db!');
  } catch (e) {
    console.log(e);
    return e;
  }
};

module.exports = connectDB;
