BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[RoleEntityTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [internal_role_id] INT NOT NULL,
    [entity_type_id] INT NOT NULL,
    CONSTRAINT [RoleEntityTypes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoleEntityTypes_internal_role_id_entity_type_id_key] UNIQUE NONCLUSTERED ([internal_role_id],[entity_type_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[RoleEntityTypes] ADD CONSTRAINT [RoleEntityTypes_internal_role_id_fkey] FOREIGN KEY ([internal_role_id]) REFERENCES [dbo].[InternalRoles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
