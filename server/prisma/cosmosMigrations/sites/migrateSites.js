import { PrismaClient } from "@prisma/client";
import demoSites from "./demoSites.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

// model ContractSites {
//   created_at            DateTime                @default(now())

//   id              Int       @id @default(autoincrement())
//   high_risk       Boolean   @default(false)
//   site_id         Int
//   contract_id     Int

//   Site                    Sites                   @relation(fields: [site_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   Contract                Contracts               @relation(fields: [contract_id], references: [id], onUpdate: NoAction, onDelete: NoAction)

//   ContractSiteServices    ContractSiteServices[]
//   VendorContractSites     VendorContractSites[]
// }

// model Sites {
//   created_at            DateTime                @default(now())

//   id                     Int                      @id(map: "PK__Sites__3213E83F412421E7") @default(autoincrement())
//   store                  String?                  @db.VarChar(100)
//   mailing_address        String?                  @db.VarChar(150)
//   mailing_address2       String?                  @db.VarChar(150)
//   mailing_city           String?                  @db.VarChar(100)
//   mailing_state          String?                  @db.Char(50)
//   mailing_zipcode        String?                  @db.VarChar(10)
//   lat                    Decimal?
//   lng                    Decimal?
//   client_id              Int
//   company_id             Int?
//   sandbox                Boolean                  @default(false)

//   Client                 Clients                  @relation(fields: [client_id], references: [id], onUpdate: NoAction, map: "FK__Sites__client_id__40F9A68C")
//   Company                Companies?               @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "FK__Sites__company_i__41EDCAC5")
//   WorkOrders             WorkOrders[]
//   ContractSites          ContractSites[]
// }

async function migrateSites() {
  const prismaServiceLines = await prisma.serviceLines.findMany();
  console.log("Fetched service lines from Prisma:", prismaServiceLines);

  // need to get the client id from the client name in the demoSites data, and then use that to set the client_id field in the Sites table.
  const matchSitesToSqlClient = async () => {
    const clients = await prisma.clients.findMany();
    const sitesWithClientId = demoSites.map((site) => {
      const client = clients.find((client) => client.client === site.client);
      if (client) {
        return { ...site, client_id: client.id };
      } else {
        console.error(`Client not found for site: ${site.client}`);
        return site;
      }
    });
    // console.log(
    //   "Sites with client_id and service lines:",
    //   sitesWithClientId.filter(
    //     (s) => s.client_id && s.serviceLines && s.serviceLines.length > 0,
    //   ),
    // );
    // console.log(
    //   "Sites without client_id:",
    //   sitesWithClientId.filter((s) => !s.client_id),
    // );
    return sitesWithClientId.filter(
      (s) => s.client_id && s.serviceLines && s.serviceLines.length > 0,
    );
  };

  const matchSitesToContracts = async () => {
    const sitesWithClientId = await matchSitesToSqlClient();
    console.log("sites with client id in createSitesInSql:", sitesWithClientId);

    let sitesWithContracts = [];

    // Match each site to an existing client contract in sql for each service line
    // For example, if a Netstreit site has Landscaping and Snow, we must find Netstreit's Landscaping and Snow contracts in sql and create a ContractSites record for each one.
    for (const site of sitesWithClientId) {
      if (!site.client_id) {
        console.error(`Skipping site ${site.subName} due to missing client_id`);
        continue;
      }
      const prisma_service_line_ids = site.serviceLines
        .map(
          (sl) =>
            prismaServiceLines.find((psl) => psl.sarlaccId === sl?.id)?.id,
        ) // SQL ids for service line are different than sarlacc ids
        .filter((sl) => typeof sl === "number");

      const matchingContracts = await prisma.contracts.findMany({
        where: {
          client_id: site.client_id,
          service_line_id: { in: prisma_service_line_ids },
        },
      });

      sitesWithContracts.push({
        ...site,
        contracts: matchingContracts.map((contract) => ({
          contract_id: contract.id, // List of SQL contract ids for this site
        })),
      });
    }

    return sitesWithContracts;
  };

  const createSitesAndContractSites = async () => {
    const sitesWithContracts = await matchSitesToContracts();
    for (const site of sitesWithContracts) {
      // Create the site in the Sites table
      const siteToUpload = {
        store: site.store?.toString(),
        client_id: site.client_id,
        mailing_address: site.address || "",
        mailing_address2: site.address2 || "",
        mailing_city: site.city || "",
        mailing_state: site.state || "",
        mailing_zipcode: site.zipcode?.toString() || "",
        lat: site.lat ?? null,
        lng: site.lng ?? null,
        ...(site.contracts?.length
          ? { ContractSites: { create: site.contracts } }
          : {}), // Create ContractSites records if there are matching contracts
      };

      const created = await prisma.sites.create({
        data: siteToUpload,
        include: {
          ContractSites: true,
        },
      });

      console.log(
        `Created site ${created.store} with id ${created.id} and ${created.ContractSites.length} contract sites.`,
      );
    }
  };

  // Create sites in sql
  await createSitesAndContractSites();
}

migrateSites();
