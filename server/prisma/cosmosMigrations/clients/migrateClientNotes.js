import { PrismaClient } from "@prisma/client";
import demoClients from "./demoClients.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

/* 
model Notes {
    id                          Int               @id @default(autoincrement())
    body                        String            @db.VarChar(1000)
    date                        DateTime          @default(now())
    sarlaccId                   String?           @db.VarChar(50)
    priority                    String            @db.VarChar(10) @default("Low")

    ms_user_id                  Int
    entity_type_id              Int
    entity_id                   Int
    parent_note_id              Int?

    Author                      Employees         @relation("NoteAuthor", fields: [ms_user_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
    EntityType                  EntityTypes       @relation(fields: [entity_type_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
    ParentNote                  Notes?            @relation("NoteReplies", fields: [parent_note_id], references: [id], onUpdate: NoAction, onDelete: NoAction)
    Replies                     Notes[]           @relation("NoteReplies")
    NoteTaggedUsers             NoteTaggedUsers[]


    @@index([entity_type_id, entity_id])
}
 */

const fetchEmployees = async () => {
  try {
    const response = await prisma.employees.findMany();
    return response;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
};

const terminatedEmployee = {
  name: "Former Employee",
  email: "terminated@nationalfacilitycontractors.com",
  ms_user_id: "00000000-0000-0000-0000-000000000000", // Placeholder ID for terminated employee
  role_id: 1, // Assuming 'Sourcer' role has an ID of 1, adjust if necessary
};

async function migrateClientNotes() {
  console.log("Starting client notes migration...");
  const employees = await fetchEmployees();
  const formerEmployee = employees.find((e) => e.name === "Former Employee");

  console.log("Former employee:", formerEmployee);

  const clientsWithNotes = demoClients.filter(
    (c) => c.notes && c.notes.length > 0,
  );

  // Pre-fetch all vendor SQL IDs in one query
  const allClients = await prisma.clients.findMany({
    where: { sarlaccId: { in: clientsWithNotes.map((c) => c.id) } },
    select: { id: true, sarlaccId: true },
  });
  const clientIdMap = new Map(allClients.map((c) => [c.sarlaccId, c.id]));

  function parseDate(d) {
    if (!d) return new Date();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function findEmployeeId(name) {
    return employees.find((e) => e.name === name)?.id ?? formerEmployee?.id;
  }

  let stats = { notes: 0, tags: 0, skippedClients: 0, skippedTags: 0 };

  for (const client of clientsWithNotes) {
    const clientSqlId = clientIdMap.get(client.id);
    if (!clientSqlId) {
      console.warn(
        `Skipping client ${client.name} (sarlaccId ${client.id}) — not in SQL`,
      );
      stats.skippedClients++;
      continue;
    }

    for (const note of client.notes) {
      const createdNote = await prisma.notes.create({
        data: {
          body: note.text || note.body || "",
          date: parseDate(note.date),
          priority: note.priority || "Low",
          author_id: findEmployeeId(note.user),
          entity_type_id: 3,
          entity_id: clientSqlId,

          /*           Author: {
            connect: {
              id: findEmployeeId(note.user),
            },
          },

          EntityType: {
            connect: {
              id: 1, // 'Vendor' entity type has an ID of 1
            },
          }, */
        },
      });
      stats.notes++;

      if (note.taggedUser) {
        const seen = new Set();
        const taggedNoteUsers = note.taggedUser
          .split(",")
          .map((u) => u.trim())
          .map((user) => {
            const id = findEmployeeId(user);
            if (!id) {
              stats.skippedTags++;
              return null;
            }
            if (seen.has(id)) return null;
            seen.add(id);
            return { tagged_user_id: id, note_id: createdNote.id };
          })
          .filter(Boolean);

        if (taggedNoteUsers.length > 0) {
          await prisma.noteTaggedUsers.createMany({ data: taggedNoteUsers });
          stats.tags += taggedNoteUsers.length;
        }
      }
    }
  }

  console.log("Migration complete:", stats);
}

migrateClientNotes();
