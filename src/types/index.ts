export interface UserPayload {
  userId: string;
  role: "ADMIN" | "OWNER";
}

declare module "fastify" {
  interface FastifyRequest {
    user?: UserPayload;
  }
}
