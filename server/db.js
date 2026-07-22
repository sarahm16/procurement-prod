// Dynamic import for PrismaClient to avoid issues with top-level await in CommonJS
const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient();

export default prisma;
