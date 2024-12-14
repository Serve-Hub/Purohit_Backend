import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./middlewares/passport.js";
import session from "express-session";
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs"; // Import YAML parser
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the external Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, "../swagger.yaml")); // Adjust path if necessary

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Serve Swagger API Docs at /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// To make app understand json data
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
