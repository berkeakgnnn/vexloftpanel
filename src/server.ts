import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

const app = buildApp();

const PORT = parseInt(process.env.PORT || "3001");

async function start(): Promise<void> {
  try {
    await redis.connect();
    console.log("Redis connected");

    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("Shutting down...");
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
