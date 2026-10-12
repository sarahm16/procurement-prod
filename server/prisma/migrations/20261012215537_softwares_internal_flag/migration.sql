BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Softwares] ADD [is_internal] BIT NOT NULL CONSTRAINT [Softwares_is_internal_df] DEFAULT 0;

   -- Seed: our own systems of record. Run through EXEC because is_internal is
   -- new in this same migration; a plain INSERT would fail to compile.
   EXEC(N'
   INSERT INTO [dbo].[Softwares] ([name], [is_internal])
   SELECT v.name, 1
   FROM (VALUES (''Sarlac''), (''UtilizeCore'')) AS v(name)
   WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Softwares] s WHERE s.name = v.name);
   ');
   
COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
