BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorContacts] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorContacts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100),
    [phone] VARCHAR(100),
    [vendor_id] INT NOT NULL,
    [contact_role_id] INT NOT NULL,
    CONSTRAINT [VendorContacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[VendorContacts] ADD CONSTRAINT [VendorContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContacts] ADD CONSTRAINT [VendorContacts_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
