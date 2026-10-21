BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ClientUsers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client_id] INT NOT NULL,
    [contact_id] INT,
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL,
    [phone] VARCHAR(20),
    [role] VARCHAR(20) NOT NULL CONSTRAINT [ClientUsers_role_df] DEFAULT 'member',
    [is_active] BIT NOT NULL CONSTRAINT [ClientUsers_is_active_df] DEFAULT 1,
    [last_login_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientUsers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [invited_by] INT,
    CONSTRAINT [ClientUsers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClientUsers_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[ClientUserSites] (
    [client_user_id] INT NOT NULL,
    [site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientUserSites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClientUserSites_pkey] PRIMARY KEY CLUSTERED ([client_user_id],[site_id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientLoginCodes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client_user_id] INT NOT NULL,
    [code_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [used_at] DATETIME2,
    [attempts] INT NOT NULL CONSTRAINT [ClientLoginCodes_attempts_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientLoginCodes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClientLoginCodes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientSessions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client_user_id] INT NOT NULL,
    [token_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked_at] DATETIME2,
    [last_seen_at] DATETIME2 NOT NULL CONSTRAINT [ClientSessions_last_seen_at_df] DEFAULT CURRENT_TIMESTAMP,
    [user_agent] VARCHAR(255),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientSessions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClientSessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClientSessions_token_hash_key] UNIQUE NONCLUSTERED ([token_hash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientUsers_client_id_idx] ON [dbo].[ClientUsers]([client_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientUserSites_site_id_idx] ON [dbo].[ClientUserSites]([site_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientLoginCodes_client_user_id_created_at_idx] ON [dbo].[ClientLoginCodes]([client_user_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientSessions_client_user_id_idx] ON [dbo].[ClientSessions]([client_user_id]);

-- AddForeignKey
ALTER TABLE [dbo].[ClientUsers] ADD CONSTRAINT [ClientUsers_client_id_fkey] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientUsers] ADD CONSTRAINT [ClientUsers_contact_id_fkey] FOREIGN KEY ([contact_id]) REFERENCES [dbo].[ClientContacts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientUsers] ADD CONSTRAINT [ClientUsers_invited_by_fkey] FOREIGN KEY ([invited_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientUserSites] ADD CONSTRAINT [ClientUserSites_client_user_id_fkey] FOREIGN KEY ([client_user_id]) REFERENCES [dbo].[ClientUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientUserSites] ADD CONSTRAINT [ClientUserSites_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientLoginCodes] ADD CONSTRAINT [ClientLoginCodes_client_user_id_fkey] FOREIGN KEY ([client_user_id]) REFERENCES [dbo].[ClientUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientSessions] ADD CONSTRAINT [ClientSessions_client_user_id_fkey] FOREIGN KEY ([client_user_id]) REFERENCES [dbo].[ClientUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
