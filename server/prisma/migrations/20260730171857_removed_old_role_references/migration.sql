/*
  Warnings:

  - You are about to drop the column `account_manager_id` on the `Clients` table. All the data in the column will be lost.
  - You are about to drop the column `operations_person_id` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `sales_person_id` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `Employees` table. All the data in the column will be lost.
  - You are about to drop the column `project_manager_id` on the `WorkOrders` table. All the data in the column will be lost.
  - You are about to drop the column `sourcer_id` on the `WorkOrders` table. All the data in the column will be lost.
  - You are about to drop the `Roles` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Clients] DROP CONSTRAINT [Clients_account_manager_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_operations_person_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_sales_person_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Employees] DROP CONSTRAINT [Employees_role_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[WorkOrders] DROP CONSTRAINT [WorkOrders_project_manager_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[WorkOrders] DROP CONSTRAINT [WorkOrders_sourcer_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Clients] DROP COLUMN [account_manager_id];

-- AlterTable
ALTER TABLE [dbo].[Contracts] DROP COLUMN [operations_person_id],
[sales_person_id];

-- AlterTable
ALTER TABLE [dbo].[Employees] DROP COLUMN [role_id];

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] DROP COLUMN [project_manager_id],
[sourcer_id];

-- DropTable
DROP TABLE [dbo].[Roles];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
