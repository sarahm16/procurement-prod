import { PrismaClient } from "@prisma/client";
import seedVendorStatuses from "./seeds/vendorStatuses.js";
import seedServiceLines from "./seeds/serviceLines.js";
import seedSoftwares from "./seeds/softwares.js";
import seedServices from "./seeds/services.js";
import seedTrades from "./seeds/trades.js";
import seedRoles from "./seeds/rolesSeed.js";
import seedEntityTypes from "./seeds/entityTypesSeed.js";
import seedContactRoles from "./seeds/contactRolesSeed.js";
import seedServiceTypes from "./seeds/serviceTypes.js";
import seedInternalRoles from "./seeds/internalRolesSeed.js";

const prisma = new PrismaClient();

async function main() {
  /* await seedVendorStatuses(prisma); */
  /*   await seedServiceLines(prisma);
  await seedSoftwares(prisma);
  await seedServices(prisma); 
  await seedTrades(prisma); */

  /*   await seedRoles(prisma);
   */
  await seedEntityTypes(prisma);
  // await seedContactRoles(prisma);

  // await seedServiceTypes(prisma);
  // await seedInternalRoles(prisma);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
