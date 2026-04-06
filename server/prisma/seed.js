import { PrismaClient } from "@prisma/client";
import seedSoftwares from "./seeds/softwares.js";

const prisma = new PrismaClient();

async function main() {
  await seedSoftwares(prisma);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
