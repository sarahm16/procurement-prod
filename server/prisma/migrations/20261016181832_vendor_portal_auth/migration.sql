BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] ADD [portal_released_at] DATETIME2,
[portal_released_by] INT;

-- CreateTable
CREATE TABLE [dbo].[VendorUsers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [contact_id] INT,
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL,
    [phone] VARCHAR(20),
    [role] VARCHAR(20) NOT NULL CONSTRAINT [VendorUsers_role_df] DEFAULT 'member',
    [is_active] BIT NOT NULL CONSTRAINT [VendorUsers_is_active_df] DEFAULT 1,
    [last_login_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorUsers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [invited_by] INT,
    CONSTRAINT [VendorUsers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorUsers_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[VendorLoginCodes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_user_id] INT NOT NULL,
    [code_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [used_at] DATETIME2,
    [attempts] INT NOT NULL CONSTRAINT [VendorLoginCodes_attempts_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorLoginCodes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorLoginCodes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorSessions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_user_id] INT NOT NULL,
    [token_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked_at] DATETIME2,
    [last_seen_at] DATETIME2 NOT NULL CONSTRAINT [VendorSessions_last_seen_at_df] DEFAULT CURRENT_TIMESTAMP,
    [user_agent] VARCHAR(255),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorSessions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorSessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorSessions_token_hash_key] UNIQUE NONCLUSTERED ([token_hash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorUsers_vendor_id_idx] ON [dbo].[VendorUsers]([vendor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorLoginCodes_vendor_user_id_created_at_idx] ON [dbo].[VendorLoginCodes]([vendor_user_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorSessions_vendor_user_id_idx] ON [dbo].[VendorSessions]([vendor_user_id]);

-- AddForeignKey
ALTER TABLE [dbo].[VendorUsers] ADD CONSTRAINT [VendorUsers_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorUsers] ADD CONSTRAINT [VendorUsers_contact_id_fkey] FOREIGN KEY ([contact_id]) REFERENCES [dbo].[VendorContacts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorUsers] ADD CONSTRAINT [VendorUsers_invited_by_fkey] FOREIGN KEY ([invited_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorLoginCodes] ADD CONSTRAINT [VendorLoginCodes_vendor_user_id_fkey] FOREIGN KEY ([vendor_user_id]) REFERENCES [dbo].[VendorUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSessions] ADD CONSTRAINT [VendorSessions_vendor_user_id_fkey] FOREIGN KEY ([vendor_user_id]) REFERENCES [dbo].[VendorUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_portal_released_by_fkey] FOREIGN KEY ([portal_released_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
