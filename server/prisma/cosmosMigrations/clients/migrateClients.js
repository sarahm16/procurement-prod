import { PrismaClient } from "@prisma/client";
import demoClients from "./demoClients.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

// model Clients {
//   id                    Int                     @id(map: "PK__Clients__3213E83F189F30A2") @default(autoincrement())
//   client                String                  @db.VarChar(100)
//   legal_name            String                  @db.VarChar(100)    // new
//   status                String                  @db.VarChar(20)
//   brand                 String                  @db.VarChar(4)      // new
//   sarlaccId             String?                  @db.VarChar(100)    // new
//   sandbox                Boolean                  @default(false)
//   mailing_address       String?                 @db.VarChar(150)
//   mailing_address2      String?                 @db.VarChar(150)
//   mailing_city          String?                 @db.VarChar(100)
//   mailing_state         String?                 @db.Char(50)
//   mailing_zipcode       String?                 @db.VarChar(10)
//   lat                   Int?
//   lng                   Int?
//   billing_address       String?                 @db.VarChar(150)
//   billing_address2      String?                 @db.VarChar(150)
//   billing_city          String?                 @db.VarChar(100)
//   billing_state         String?                 @db.Char(50)
//   billing_zipcode       String?                 @db.VarChar(10)

//   ClientServiceLines    ClientServiceLines[]
//   ClientServiceLineSOWs ClientServiceLineSOWs[]
//   Companies             Companies[]
//   Sites                 Sites[]
//   Contracts             Contracts[]
//   Contacts              ClientContacts[]
// }

// model ContactRoles {
//   id                  Int       @id @default(autoincrement())
//   name                String    @db.VarChar(50)

//   ClientContacts      ClientContacts[]
// }

// model ClientContacts {
//   id                  Int       @id @default(autoincrement())
//   name                 String   @db.VarChar(100)
//   email                String?  @db.VarChar(100)
//   phone                String?  @db.VarChar(100)
//   client_id            Int
//   contact_role_id         Int

//   ContactRole        ContactRoles      @relation(fields: [contact_role_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
//   Client              Clients          @relation(fields: [client_id], references: [id], onUpdate: NoAction, onDelete: NoAction)

// }

const prismaServiceLines = [
  {
    id: 1,
    name: "Janitorial",
    sarlaccId: 1,
    ServiceLineServices: [],
  },
  {
    id: 2,
    name: "Landscaping",
    sarlaccId: 4,
    ServiceLineServices: [],
  },
  {
    id: 3,
    name: "Landscape Construction",
    sarlaccId: 7,
    ServiceLineServices: [],
  },
  {
    id: 4,
    name: "Lot Sweeping",
    sarlaccId: 3,
    ServiceLineServices: [],
  },
  {
    id: 5,
    name: "Snow",
    sarlaccId: 2,
    ServiceLineServices: [],
  },
  {
    id: 6,
    name: "Asphalt",
    sarlaccId: 5,
    ServiceLineServices: [],
  },
  {
    id: 7,
    name: "On Demand",
    sarlaccId: 46,
    ServiceLineServices: [],
  },
  {
    id: 8,
    name: "HVAC",
    sarlaccId: 6,
    ServiceLineServices: [],
  },
  {
    id: 9,
    name: "Pressure Washing",
    sarlaccId: 8,
    ServiceLineServices: [],
  },
  {
    id: 10,
    name: "Residential",
    sarlaccId: 9,
    ServiceLineServices: [],
  },
];

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

async function migrateClients() {
  console.log("Starting client migration...");
  const clientStatuses = ["Active", "Paused", "Archived"];

  // Transform array of vendors from NoSQL data structure to SQL-compatible format
  const transformedClients = await Promise.all(
    demoClients.map(async (client) => {
      // Get the address components for the client's address that is stored as a single string in NoSQL
      const address_components = await getAddressComponents(client.address);

      const contacts = [];
      const serviceLines = (client.serviceLines || [])
        .map((sl) => {
          const matchingServiceLine = prismaServiceLines.find(
            (psl) => psl.sarlaccId === sl.id,
          );
          return matchingServiceLine
            ? { service_line_id: matchingServiceLine.id }
            : null;
        })
        .filter((sl) => sl !== null);

      if (client?.contact?.name) {
        contacts.push({
          name: client.contact?.name,
          phone: client.contact?.phone,
          email: client.contact?.email,
          contact_role_id: 1, // Assuming 1 is the ID for "Primary" role
        });
      }

      if (client?.billingContact?.name) {
        contacts.push({
          name: client.billingContact?.name,
          phone: client.billingContact?.phone,
          email: client.billingContact?.email,
          contact_role_id: 2, // Assuming 2 is the ID for "Billing" role
        });
      }

      return {
        ...address_components,
        brand: "NFC",
        sarlaccId: client.id,
        client: client.client,
        legal_name: client?.client,
        status: client?.status,
        sandbox: true,
        ...(contacts.length > 0 ? { Contacts: { create: contacts } } : {}),
        ...(serviceLines.length > 0
          ? { ClientServiceLines: { create: serviceLines } }
          : {}),
      };
    }),
  );

  console.log("Transformed Clients:", transformedClients);

  const createdClients = await prisma.$transaction(
    transformedClients.map((data) => prisma.clients.create({ data })),
  );
}

migrateClients();

// IN PRODUCTION:
// - Need to also migrate software?
