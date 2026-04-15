import { PrismaClient } from "@prisma/client";
import seedVendorStatuses from "./seeds/vendorStatuses.js";

const prisma = new PrismaClient();

async function main() {
  await seedVendorStatuses(prisma);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
