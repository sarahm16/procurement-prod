/*
  Warnings:

  - Added the required column `brand` to the `Clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legal_name` to the `Clients` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [brand] VARCHAR(4) NOT NULL,
[legal_name] VARCHAR(100) NOT NULL,
[sarlaccId] VARCHAR(100);

-- CreateTable
CREATE TABLE [dbo].[ContactRoles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [ContactRoles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientContacts] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100),
    [phone] VARCHAR(100),
    [client_id] INT NOT NULL,
    [contact_role] INT NOT NULL,
    CONSTRAINT [ClientContacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ClientContacts] ADD CONSTRAINT [ClientContacts_contact_role_fkey] FOREIGN KEY ([contact_role]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientContacts] ADD CONSTRAINT [ClientContacts_client_id_fkey] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
