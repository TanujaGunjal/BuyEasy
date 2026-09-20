const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Log loudly but do NOT exit — Cloud Run needs the process alive so
    // the /health endpoint can still respond and liveness probes pass.
    // All DB-dependent routes will fail until the connection is established.
    //
    // Common causes:
    //   - Wrong MONGO_URI secret value
    //   - Atlas Network Access list does not include Cloud Run egress
    //     (add 0.0.0.0/0 for Cloud Run — it has no fixed IP)
    //   - Atlas cluster is paused
    //
    // NEVER log process.env.MONGO_URI — it contains credentials.
    console.error(
      '[DB] MongoDB connection failed. Server keeps running; all DB routes will error.\n' +
      '[DB] Cause: ' + error.message + '\n' +
      '[DB] Check: correct MONGO_URI secret? Atlas Network Access allows Cloud Run (0.0.0.0/0)?'
    );
  }
};

module.exports = connectDB;
