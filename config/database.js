import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connect to MongoDB database using MONGODB_URI environment variable
 */
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    // Try to connect with the explicitly requested legacy options
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    const isUnsupportedOptionError = 
      error.message.toLowerCase().includes('usenewurlparser') || 
      error.message.toLowerCase().includes('useunifiedtopology') || 
      error.message.toLowerCase().includes('not supported');

    if (isUnsupportedOptionError) {
      try {
        // Fallback: Retry without unsupported options for newer Mongoose versions
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host} (connected without deprecated options)`);
        return;
      } catch (retryError) {
        console.error(`MongoDB Connection Error: ${retryError.message}`);
        process.exit(1);
      }
    }

    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
