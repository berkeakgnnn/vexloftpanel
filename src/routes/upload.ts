import { FastifyInstance } from "fastify";
import { saveFile } from "../lib/upload.js";
import { authenticate } from "../middleware/auth.js";

export default async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // POST /upload — accept multipart file, save it, return path and url
  app.post(
    "/upload",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      // Use the business slug from query param, or fall back to user id as folder name
      const { businessSlug } = request.query as { businessSlug?: string };
      const folder = businessSlug ?? request.user!.userId;

      try {
        const filePath = await saveFile(data, folder);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

        return reply.status(201).send({
          path: filePath,
          url: `${baseUrl}${filePath}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return reply.status(400).send({ error: message });
      }
    }
  );
}
