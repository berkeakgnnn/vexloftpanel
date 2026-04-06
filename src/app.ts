import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve } from "path";
import { ZodError } from "zod";

import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import themeRoutes from "./routes/themes.js";
import businessInfoRoutes from "./routes/business-info.js";
import categoryRoutes from "./routes/categories.js";
import menuItemRoutes from "./routes/menu-items.js";
import uploadRoutes from "./routes/upload.js";
import publicRoutes from "./routes/public.js";
import seedTemplateRoutes from "./routes/seed-template.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true, credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] });
  app.register(multipart, {
    limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || "5242880") },
  });

  const uploadDir = resolve(process.env.UPLOAD_DIR || "./uploads");
  app.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads",
    decorateReply: false,
  });

  // Routes
  app.register(authRoutes);
  app.register(businessRoutes);
  app.register(themeRoutes);
  app.register(businessInfoRoutes);
  app.register(categoryRoutes);
  app.register(menuItemRoutes);
  app.register(uploadRoutes);
  app.register(publicRoutes);
  app.register(seedTemplateRoutes);

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Global error handler — catches ZodError for 400, everything else as 500
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      // Zod v4 uses .issues (not .errors)
      return reply.status(400).send({
        error: "Validation error",
        details: error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
      });
    }

    app.log.error(error);
    const fastifyError = error as { statusCode?: number; message?: string };
    return reply.status(fastifyError.statusCode || 500).send({
      error: fastifyError.message || "Internal server error",
    });
  });

  return app;
}
