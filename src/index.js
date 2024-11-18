import app from "./app.js";
import connectDB from "./database/connect.db.js";


//Assigning a port
const PORT = process.env.PORT;

//Database Connection
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`App is listening at port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed!!!", err);
  });
