BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ActivityLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [entity_type_id] INT NOT NULL,
    [entity_id] INT NOT NULL,
    [field_changed] VARCHAR(100),
    [previous_value] NVARCHAR(500),
    [new_value] NVARCHAR(500),
    [changed_by] VARCHAR(100),
    [changed_at] DATETIME CONSTRAINT [DF__ActivityL__chang__6FB49575] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Activity__3213E83F261F0A47] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Clients] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client] VARCHAR(100) NOT NULL,
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] CHAR(2),
    [mailing_zipcode] VARCHAR(10),
    [lat] INT,
    [lng] INT,
    [billing_address] VARCHAR(150),
    [billing_address2] VARCHAR(150),
    [billing_city] VARCHAR(100),
    [billing_state] CHAR(2),
    [billing_zipcode] VARCHAR(10),
    CONSTRAINT [PK__Clients__3213E83F189F30A2] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientServiceLines] (
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    CONSTRAINT [PK_ClientServiceLines] PRIMARY KEY CLUSTERED ([client_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientServiceLineSOWs] (
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [pandadoc_content_library_uuid] VARCHAR(100) NOT NULL,
    [description] VARCHAR(200),
    CONSTRAINT [PK_ClientServiceLineSOWs] PRIMARY KEY CLUSTERED ([client_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[Companies] (
    [id] INT NOT NULL IDENTITY(1,1),
    [company] VARCHAR(100) NOT NULL,
    [client_id] INT,
    CONSTRAINT [PK__Companie__3213E83FBC38A215] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Employees] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ms_user_id] VARCHAR(100) NOT NULL,
    [name] VARCHAR(100),
    [email] VARCHAR(100),
    CONSTRAINT [PK__Employee__3213E83F5DB792B8] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EntityTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK__EntityTy__3213E83FE1719A23] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Service_Lines] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK__Service___3213E83F8FFD9AE8] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineExhibitTemplates] (
    [id] INT NOT NULL IDENTITY(1,1),
    [service_line_id] INT NOT NULL,
    [pandadoc_template_id] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK__ServiceL__3213E83F2716E9C4] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Sites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [store] VARCHAR(100),
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] CHAR(2),
    [mailing_zipcode] VARCHAR(10),
    [lat] INT,
    [lng] INT,
    [client_id] INT NOT NULL,
    [company_id] INT,
    CONSTRAINT [PK__Sites__3213E83F412421E7] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteServiceLines] (
    [site_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    CONSTRAINT [PK_SiteServiceLines] PRIMARY KEY CLUSTERED ([site_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[Trades] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(200),
    CONSTRAINT [PK__Trades__3213E83FB5206A3D] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Vendors] (
    [id] INT NOT NULL IDENTITY(1,1),
    [company] VARCHAR(100) NOT NULL,
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] CHAR(2),
    [mailing_zipcode] VARCHAR(10),
    [lat] INT,
    [lng] INT,
    [billing_address] VARCHAR(150),
    [billing_address2] VARCHAR(150),
    [billing_city] VARCHAR(100),
    [billing_state] CHAR(2),
    [billing_zipcode] VARCHAR(10),
    [status_id] INT,
    CONSTRAINT [PK__Vendors__3213E83F06619C60] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorSites] (
    [vendor_id] INT NOT NULL,
    [site_id] INT NOT NULL,
    CONSTRAINT [PK_VendorSites] PRIMARY KEY CLUSTERED ([vendor_id],[site_id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorSiteServiceLines] (
    [vendor_id] INT NOT NULL,
    [site_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [is_primary] BIT NOT NULL CONSTRAINT [DF__VendorSit__is_pr__531856C7] DEFAULT 0,
    [status_id] INT NOT NULL,
    CONSTRAINT [PK_VendorSiteServiceLines] PRIMARY KEY CLUSTERED ([vendor_id],[site_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorSiteStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [category] VARCHAR(20) NOT NULL,
    [description] VARCHAR(200),
    CONSTRAINT [PK__VendorSi__3213E83F10849821] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [description] VARCHAR(200),
    CONSTRAINT [PK__VendorSt__3213E83FAC107989] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorTrades] (
    [vendor_id] INT NOT NULL,
    [trade_id] INT NOT NULL,
    CONSTRAINT [PK_VendorTrades] PRIMARY KEY CLUSTERED ([vendor_id],[trade_id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrders] (
    [id] INT NOT NULL IDENTITY(1,1),
    [trade_id] INT NOT NULL,
    [site_id] INT NOT NULL,
    [project_manager_id] INT,
    [sourcer_id] INT,
    [status] VARCHAR(50),
    CONSTRAINT [PK__WorkOrde__3213E83FA1A0BFFC] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [vendor_id] INT,
    [service] VARCHAR(200),
    [client_price] DECIMAL(10,2),
    [vendor_price] DECIMAL(10,2),
    [is_upsell] BIT NOT NULL CONSTRAINT [DF__WorkOrder__is_up__634EBE90] DEFAULT 0,
    [pm_id] INT,
    CONSTRAINT [PK__WorkOrde__3213E83FF413C92F] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_ActivityLog_Entity] ON [dbo].[ActivityLog]([entity_type_id], [entity_id]);

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [FK__ActivityL__entit__70A8B9AE] FOREIGN KEY ([entity_type_id]) REFERENCES [dbo].[EntityTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLines] ADD CONSTRAINT [FK__ClientSer__clien__47A6A41B] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLines] ADD CONSTRAINT [FK__ClientSer__servi__489AC854] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[Service_Lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD CONSTRAINT [FK__ClientSer__clien__6BE40491] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD CONSTRAINT [FK__ClientSer__servi__6CD828CA] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[Service_Lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Companies] ADD CONSTRAINT [FK__Companies__clien__3E1D39E1] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineExhibitTemplates] ADD CONSTRAINT [FK__ServiceLi__servi__690797E6] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[Service_Lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [FK__Sites__client_id__40F9A68C] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [FK__Sites__company_i__41EDCAC5] FOREIGN KEY ([company_id]) REFERENCES [dbo].[Companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteServiceLines] ADD CONSTRAINT [FK__SiteServi__servi__4C6B5938] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[Service_Lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteServiceLines] ADD CONSTRAINT [FK__SiteServi__site___4B7734FF] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vendors] ADD CONSTRAINT [FK__Vendors__status___44CA3770] FOREIGN KEY ([status_id]) REFERENCES [dbo].[VendorStatuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSites] ADD CONSTRAINT [FK__VendorSit__site___503BEA1C] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSites] ADD CONSTRAINT [FK__VendorSit__vendo__4F47C5E3] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] ADD CONSTRAINT [FK__VendorSit__servi__55F4C372] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[Service_Lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] ADD CONSTRAINT [FK__VendorSit__site___55009F39] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] ADD CONSTRAINT [FK__VendorSit__statu__56E8E7AB] FOREIGN KEY ([status_id]) REFERENCES [dbo].[VendorSiteStatuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] ADD CONSTRAINT [FK__VendorSit__vendo__540C7B00] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorTrades] ADD CONSTRAINT [FK__VendorTra__trade__5AB9788F] FOREIGN KEY ([trade_id]) REFERENCES [dbo].[Trades]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorTrades] ADD CONSTRAINT [FK__VendorTra__vendo__59C55456] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [FK__WorkOrder__proje__5F7E2DAC] FOREIGN KEY ([project_manager_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [FK__WorkOrder__site___5E8A0973] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [FK__WorkOrder__sourc__607251E5] FOREIGN KEY ([sourcer_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [FK__WorkOrder__trade__5D95E53A] FOREIGN KEY ([trade_id]) REFERENCES [dbo].[Trades]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [FK__WorkOrder__pm_id__662B2B3B] FOREIGN KEY ([pm_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [FK__WorkOrder__vendo__65370702] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [FK__WorkOrder__work___6442E2C9] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
