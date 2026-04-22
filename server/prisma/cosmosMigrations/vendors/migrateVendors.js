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

const extractFromAddress = (address_components, type) => {
  const component = address_components.find((component) =>
    component.types.includes(type),
  );

  return component ? component.long_name : "";
};

const getExtractedAddress = (address_components) => {
  const street = extractFromAddress(address_components, "street_number");
  const route = extractFromAddress(address_components, "route");
  const city =
    extractFromAddress(address_components, "locality") ||
    extractFromAddress(address_components, "administrative_area_level_3");
  const state = extractFromAddress(
    address_components,
    "administrative_area_level_1",
  );
  const zipcode = extractFromAddress(address_components, "postal_code");

  return {
    mailing_address: street && route ? `${street} ${route}` : "",
    mailing_address2: "",
    mailing_city: city || "",
    mailing_state: state || "",
    mailing_zipcode: zipcode || "",
  };
};

const getAddressComponents = async (address) => {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
  );
  const data = await response.json();
  if (data.results.length > 0) {
    const extracted_address = getExtractedAddress(
      data.results[0].address_components,
    );
    return {
      ...extracted_address,
      lat: data.results[0]?.geometry.location.lat,
      lng: data.results[0]?.geometry.location.lng,
    };
  }
  // Default values if no results found
  return {
    mailing_address: "",
    mailing_address2: "",
    mailing_city: "",
    mailing_state: "",
    mailing_zipcode: "",
    lat: 0,
    lng: 0,
  };
};

const fetchVendorStatuses = async () => {
  try {
    const response = await prisma.vendorStatuses.findMany();
    return response;
  } catch (error) {
    console.error("Error fetching vendor statuses:", error);
    return [];
  }
};

async function migrateVendors() {
  console.log("Starting vendor migration...");
  const vendorStatuses = await fetchVendorStatuses();
  console.log("Fetched vendor statuses:", vendorStatuses);

  // Transform array of vendors from NoSQL data structure to SQL-compatible format
  const transformedVendors = await Promise.all(
    demoVendors.map(async (vendor) => {
      // Get the address components for the vendor's address that is stored as a single string in NoSQL
      const address_components = await getAddressComponents(vendor.address);

      return {
        ...address_components,
        sarlaccId: vendor.id,
        company: vendor.company,
        contact_name: vendor.contact,
        contact_phone: vendor.phone,
        contact_phone2: "",
        contact_email: "",

        status_id:
          vendorStatuses.find((status) => status.name === vendor.status)?.id ||
          1,
        sandbox: true,
      };
    }),
  );

  console.log("Transformed Vendors:", transformedVendors);

  const createdVendors = await prisma.vendors.createMany({
    data: transformedVendors,
  });
}

migrateVendors();
