import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import { serveWebApp } from "./lib/web";

const isProduction = process.env.NODE_ENV === "production";

const app: Express = express();

// Railway (like most PaaS hosts) terminates TLS at its edge and forwards over
// plain HTTP. Without this, express-session sees an insecure request and
// refuses to set the `Secure` cookie, so nobody can log in. Scoped to
// production: locally there is no proxy, and trusting X-Forwarded-* from a
// direct client would let it lie about the protocol.
if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
  throw new Error(
    "SESSION_SECRET must be set in production. Generate one with `openssl rand -hex 32`.",
  );
}

app.use(
  session({
    secret: sessionSecret || "red-front-hiring-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Served over HTTPS in production; plain HTTP for local development.
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// Mounted last so unknown /api routes keep returning JSON, not the HTML shell.
serveWebApp(app);

export default app;
