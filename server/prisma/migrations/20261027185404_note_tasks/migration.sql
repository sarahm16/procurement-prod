BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Notes] ADD [assignee_id] INT,
[completed_at] DATETIME2,
[completed_by] INT,
[due_date] DATE;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notes_assignee_id_completed_at_idx] ON [dbo].[Notes]([assignee_id], [completed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notes_author_id_completed_at_idx] ON [dbo].[Notes]([author_id], [completed_at]);

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_assignee_id_fkey] FOREIGN KEY ([assignee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_completed_by_fkey] FOREIGN KEY ([completed_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
