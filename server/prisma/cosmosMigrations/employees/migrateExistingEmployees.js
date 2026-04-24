import { PrismaClient } from "@prisma/client";
import existingEmployees from "./existingEmployees.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();

async function migrateExistingEmployees() {
  const filteredEmployees = existingEmployees
    .filter(
      (employee) =>
        !employee.displayName?.includes("-") &&
        employee.mail &&
        employee.displayName,
    )
    .map((employee) => ({
      name: employee.displayName,
      email: employee.mail,
      ms_user_id: employee.id,
      role_id: 1, // Assuming 'Sourcer' role has an ID of 1, adjust if necessary
    }));

  const createdEmployees = await prisma.employees.createMany({
    data: filteredEmployees,
  });
}

migrateExistingEmployees();
