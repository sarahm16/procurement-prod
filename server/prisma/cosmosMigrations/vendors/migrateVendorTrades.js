import { PrismaClient } from "@prisma/client";
import demoVendors from "./demoVendors.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

/* model Vendors {
  id                     Int                      @id(map: "PK__Vendors__3213E83F06619C60") @default(autoincrement())
  sarlaccId              String                   @db.VarChar(50) @unique
  company                String                   @db.VarChar(100)
  sandbox                Boolean                  @default(false)
  contact_name           String?                  @db.VarChar(100)
  contact_phone          String?                  @db.VarChar(20)
  contact_phone2         String?                 @db.VarChar(20)
  contact_email          String?                  @db.VarChar(100)
  quickbooks_id          String?                  @db.VarChar(100)
  mailing_address        String?                  @db.VarChar(150)
  mailing_address2       String?                  @db.VarChar(150)
  mailing_city           String?                  @db.VarChar(100)
  mailing_state          String?                  @db.Char(50)
  mailing_zipcode        String?                  @db.VarChar(10)
  lat                    Int?
  lng                    Int?
  billing_address        String?                  @db.VarChar(150)
  billing_address2       String?                  @db.VarChar(150)
  billing_city           String?                  @db.VarChar(100)
  billing_state          String?                  @db.Char(50)
  billing_zipcode        String?                  @db.VarChar(10)

  status_id              Int

  VendorStatuses         VendorStatuses           @relation(fields: [status_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "FK__Vendors__status___44CA3770")
  
  VendorSites            VendorSites[]
  VendorSiteServiceLines VendorSiteServiceLines[]
  VendorTrades           VendorTrades[]
  WorkOrderServices      WorkOrderServices[]
  VendorServicePricing   VendorServicePricing[]
} */

const fetchTrades = async () => {
  try {
    const response = await prisma.trades.findMany();
    return response;
  } catch (error) {
    console.error("Error fetching trades:", error);
    return [];
  }
};

async function migrateVendorTrades() {
  console.log("Starting vendor migration...");
  const trades = await fetchTrades();

  const migratedTrades = await Promise.allSettled(
    demoVendors.map(async (vendor) => {
      if (!vendor.trades) {
        return [];
      } else {
        const sqlVendor = await prisma.vendors.findUnique({
          where: { sarlaccId: vendor.id },
        });

        if (!sqlVendor) {
          return [];
        }

        const vendorTrades = vendor?.trades.map((trade) => {
          const mappedTrade = trades.find((t) => t.id === trade.id);
          return {
            vendor_id: sqlVendor.id,
            trade_id: mappedTrade?.id,
          };
        });

        return [...vendorTrades];
      }
    }),
  );

  const flatMigratedTrades = migratedTrades.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error("Error migrating vendor trades:", result.reason);
      return [];
    }
  });

  console.log("Migrated vendor trades:", flatMigratedTrades);

  const createdVendorTrades = await prisma.vendorTrades.createMany({
    data: flatMigratedTrades,
  });
}

migrateVendorTrades();
