import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

// model Contracts {
//   id                      Int         @id @default(autoincrement())
//   start_date              DateTime    @default(now()) @db.DateTime
//   end_date                DateTime?   @db.DateTime
//   auto_renew              Boolean     @default(false)
//   annual_increase_percent Decimal?
//   value                   Decimal
//   project_name            String

//   client_id               Int
//   service_line_id         Int
//   software_id             Int?
//   sales_person_id         Int?
//   operations_person_id    Int?

//   ServiceLine             ServiceLines    @relation(fields: [service_line_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   Client                  Clients         @relation(fields: [client_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   Software                Softwares?      @relation(fields: [software_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   ProjectManager          Employees?      @relation("ContractProjectManager", fields: [project_manager_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   SalesPerson             Employees?      @relation("ContractSalesPerson", fields: [sales_person_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   OperationsPerson        Employees?      @relation("ContractOperationsPerson", fields: [operations_person_id], references: [id], onUpdate: NoAction, onDelete: NoAction)

//   ContractSites                   ContractSites[]
// }

async function createPlaceholderContracts() {
  const clientServiceLines = await prisma.clientServiceLines.findMany({
    include: {
      Client: {
        select: {
          client: true,
        },
      },
      ServiceLine: {
        select: {
          name: true,
        },
      },
    },
  });
  console.log(
    `Found ${clientServiceLines.length} client service lines:`,
    clientServiceLines,
  );

  const contractsToCreate = clientServiceLines.map((csl) => ({
    client_id: csl.client_id,
    service_line_id: csl.service_line_id,
    value: 0,
    project_name: `${csl.Client.client} - ${csl.ServiceLine.name}`,
  }));

  const createdContracts = await prisma.contracts.createMany({
    data: contractsToCreate,
  });

  console.log(
    `Created ${createdContracts.count} placeholder contracts for client service lines.`,
  );

  // IN PRODUCTION:
  // - get list of employees and assign project manager, sales person, operations person
}

createPlaceholderContracts();
