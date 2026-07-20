BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Clients] ALTER COLUMN [mailing_state] VARCHAR(50) NULL;
ALTER TABLE [dbo].[Clients] ALTER COLUMN [billing_state] VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE [dbo].[Sites] ALTER COLUMN [mailing_state] VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE [dbo].[Vendors] ALTER COLUMN [mailing_state] VARCHAR(50) NULL;
ALTER TABLE [dbo].[Vendors] ALTER COLUMN [billing_state] VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE [dbo].[SiteContacts] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [SiteContacts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100),
    [phone] VARCHAR(100),
    [site_id] INT NOT NULL,
    [contact_role_id] INT NOT NULL,
    CONSTRAINT [SiteContacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[SiteContacts] ADD CONSTRAINT [SiteContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteContacts] ADD CONSTRAINT [SiteContacts_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
