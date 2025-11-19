import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes/index.js";

dotenv.config();

const app: Application = express();

// Middlewares de sécurité
app.use(helmet());
app.use(cors());

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(morgan("dev"));

// Routes principales
app.use("/api", routes);

// Route racine
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Bienvenue sur l'API Tourneo",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      tournaments: "/api/tournaments",
    },
  });
});

// Gestion des routes non trouvées
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route non trouvée",
    path: req.path,
  });
});

// Gestion des erreurs
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Erreur serveur",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
