BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorExhibits] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [service_line_id] INT,
    [pandadoc_id] NVARCHAR(1000),
    [template_id] NVARCHAR(1000),
    [is_work_order] BIT NOT NULL CONSTRAINT [VendorExhibits_is_work_order_df] DEFAULT 0,
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [date_completed] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorExhibits_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorExhibits_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PandaDocUserTokens] (
    [id] INT NOT NULL IDENTITY(1,1),
    [employee_id] INT NOT NULL,
    [access_token] VARCHAR(2000) NOT NULL,
    [refresh_token] VARCHAR(2000) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [PandaDocUserTokens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [PandaDocUserTokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PandaDocUserTokens_employee_id_key] UNIQUE NONCLUSTERED ([employee_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibits] ADD CONSTRAINT [VendorExhibits_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibits] ADD CONSTRAINT [VendorExhibits_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PandaDocUserTokens] ADD CONSTRAINT [PandaDocUserTokens_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
