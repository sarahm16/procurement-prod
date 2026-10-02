BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[InternalRoles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(100),
    CONSTRAINT [InternalRoles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RoleAssignments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [employee_id] INT NOT NULL,
    [internal_role_id] INT NOT NULL,
    [entity_type_id] INT NOT NULL,
    [entity_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [RoleAssignments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RoleAssignments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RoleAssignments_entity_type_id_entity_id_idx] ON [dbo].[RoleAssignments]([entity_type_id], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RoleAssignments_employee_id_idx] ON [dbo].[RoleAssignments]([employee_id]);

-- AddForeignKey
ALTER TABLE [dbo].[RoleAssignments] ADD CONSTRAINT [RoleAssignments_internal_role_id_fkey] FOREIGN KEY ([internal_role_id]) REFERENCES [dbo].[InternalRoles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoleAssignments] ADD CONSTRAINT [RoleAssignments_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
