import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";

export default function notesRouter(prisma) {
  const router = Router();

  // GET /api/notes
  router.get("/", async (req, res) => {
    try {
      const notes = await prisma.notes.findMany({
        include: {
          Author: true,
          NoteTaggedUsers: { include: { TaggedUser: true } },
          Replies: {
            include: {
              Author: true,
              NoteTaggedUsers: { select: { TaggedUser: true } },
            },
          },
        },
      });
      res.json(notes.map(serializeNote));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching notes:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching notes:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/notes
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const {
        body,
        entity_type_id,
        entity_id,
        tagged_user_ids,
        priority,
        author_id,
      } = req.body;

      const note = await prisma.notes.create({
        data: {
          body,
          entity_type_id,
          entity_id,
          author_id: author_id || 1, // Default to user ID 1 if not provided, replace with actual auth logic
          NoteTaggedUsers: {
            create: tagged_user_ids.map((id) => ({ tagged_user_id: id })),
          },
          priority,
        },
        include: {
          Author: true,
          NoteTaggedUsers: { include: { TaggedUser: true } },
        },
      });
      console.log("Created note:", note);
      res.status(201).json(serializeNote(note));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating note:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating note:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
