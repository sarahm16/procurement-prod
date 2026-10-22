# Schema change: `workorder.prisma`

In `model WorkOrderStatuses`, add one line under `color`:

```prisma
model WorkOrderStatuses {
  id          Int          @id @default(autoincrement())
  name        String       @db.VarChar(30)
  description String?      @db.VarChar(100)
  color       String?      @db.VarChar(8)
  phase       String       @default("ops") @db.VarChar(10)   // ← add: "ops" | "finance"
  WorkOrders  WorkOrders[]
}
```

`WorkOrders.phase` already exists (`@default("ops")`), so nothing changes there.

Then:

```
npx prisma migrate dev --create-only --name finance_statuses
```

Open the new `migration.sql` and paste `custom-sql.sql` just above `COMMIT TRAN;`.
Then run `npx prisma migrate dev`.
