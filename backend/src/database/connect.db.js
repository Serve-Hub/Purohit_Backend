import mongoose from "mongoose";

const userName = process.env.USERNAME;
const password = encodeURIComponent(process.env.PASSWORD);
const dbName = process.env.DB_NAME;
const host = process.env.HOST;

const connectDB = async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${userName}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=Kuber`
    );
    console.log("Connection Successful..");
  } catch (error) {
    console.log(error.message);
  }
};
// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to application termination");
  process.exit(0);
});

export default connectDB;
