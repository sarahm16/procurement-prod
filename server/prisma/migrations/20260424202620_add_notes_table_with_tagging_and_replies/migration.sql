BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Notes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [body] VARCHAR(1000) NOT NULL,
    [date] DATETIME2 NOT NULL CONSTRAINT [Notes_date_df] DEFAULT CURRENT_TIMESTAMP,
    [sarlaccId] VARCHAR(50),
    [priority] VARCHAR(10) NOT NULL CONSTRAINT [Notes_priority_df] DEFAULT 'Low',
    [ms_user_id] INT NOT NULL,
    [entity_type_id] INT NOT NULL,
    [entity_id] INT NOT NULL,
    [parent_note_id] INT,
    CONSTRAINT [Notes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NoteTaggedUsers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [note_id] INT NOT NULL,
    [tagged_user_id] INT NOT NULL,
    CONSTRAINT [NoteTaggedUsers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NoteTaggedUsers_note_id_tagged_user_id_key] UNIQUE NONCLUSTERED ([note_id],[tagged_user_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notes_entity_type_id_entity_id_idx] ON [dbo].[Notes]([entity_type_id], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NoteTaggedUsers_tagged_user_id_idx] ON [dbo].[NoteTaggedUsers]([tagged_user_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_ms_user_id_fkey] FOREIGN KEY ([ms_user_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_entity_type_id_fkey] FOREIGN KEY ([entity_type_id]) REFERENCES [dbo].[EntityTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_parent_note_id_fkey] FOREIGN KEY ([parent_note_id]) REFERENCES [dbo].[Notes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteTaggedUsers] ADD CONSTRAINT [NoteTaggedUsers_note_id_fkey] FOREIGN KEY ([note_id]) REFERENCES [dbo].[Notes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteTaggedUsers] ADD CONSTRAINT [NoteTaggedUsers_tagged_user_id_fkey] FOREIGN KEY ([tagged_user_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
