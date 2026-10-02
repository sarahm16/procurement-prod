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
    [changed_by] INT NOT NULL,
    [changed_at] DATETIME CONSTRAINT [DF__ActivityL__chang__6FB49575] DEFAULT CURRENT_TIMESTAMP,
    [action] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK__Activity__3213E83F261F0A47] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLines] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [sarlaccId] INT,
    CONSTRAINT [PK__Service___3213E83F8FFD9AE8] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ServiceLines_sarlaccId_key] UNIQUE NONCLUSTERED ([sarlaccId])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [service_line_id] INT NOT NULL,
    CONSTRAINT [ServiceLineServices_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineExhibitTemplates] (
    [id] INT NOT NULL IDENTITY(1,1),
    [service_line_id] INT NOT NULL,
    [pandadoc_template_id] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK__ServiceL__3213E83F2716E9C4] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Trades] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(200),
    [sarlaccId] INT,
    CONSTRAINT [PK__Trades__3213E83FB5206A3D] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Softwares] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [Softwares_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Clients] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client] VARCHAR(100) NOT NULL,
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] VARCHAR(50),
    [mailing_zipcode] VARCHAR(10),
    [lat] DECIMAL(32,16),
    [lng] DECIMAL(32,16),
    [billing_address] VARCHAR(150),
    [billing_address2] VARCHAR(150),
    [billing_city] VARCHAR(100),
    [billing_state] VARCHAR(50),
    [billing_zipcode] VARCHAR(10),
    [brand] VARCHAR(4) NOT NULL,
    [legal_name] VARCHAR(100) NOT NULL,
    [sarlaccId] VARCHAR(100),
    [status] VARCHAR(20) NOT NULL,
    [sandbox] BIT NOT NULL CONSTRAINT [Clients_sandbox_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Clients_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [tax_treatment] VARCHAR(30) NOT NULL CONSTRAINT [Clients_tax_treatment_df] DEFAULT 'Billed separately',
    CONSTRAINT [PK__Clients__3213E83F189F30A2] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Companies] (
    [id] INT NOT NULL IDENTITY(1,1),
    [company] VARCHAR(100) NOT NULL,
    [client_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Companies_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Companie__3213E83FBC38A215] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientContacts] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100),
    [phone] VARCHAR(100),
    [client_id] INT NOT NULL,
    [contact_role_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientContacts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClientContacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientServiceLines] (
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientServiceLines_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ClientServiceLines] PRIMARY KEY CLUSTERED ([client_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientServiceLineSOWs] (
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [pandadoc_content_library_uuid] VARCHAR(100) NOT NULL,
    [description] VARCHAR(200),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientServiceLineSOWs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ClientServiceLineSOWs] PRIMARY KEY CLUSTERED ([client_id],[service_line_id])
);

-- CreateTable
CREATE TABLE [dbo].[Contracts] (
    [id] INT NOT NULL IDENTITY(1,1),
    [start_date] DATETIME NOT NULL CONSTRAINT [Contracts_start_date_df] DEFAULT CURRENT_TIMESTAMP,
    [end_date] DATETIME,
    [auto_renew] BIT NOT NULL CONSTRAINT [Contracts_auto_renew_df] DEFAULT 0,
    [annual_increase_percent] DECIMAL(32,16),
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [software_id] INT,
    [project_name] NVARCHAR(1000) NOT NULL,
    [value] DECIMAL(32,16) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Contracts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [service_type_id] INT,
    CONSTRAINT [Contracts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(300),
    CONSTRAINT [ServiceTypes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [high_risk] BIT NOT NULL CONSTRAINT [ContractSites_high_risk_df] DEFAULT 0,
    [site_id] INT NOT NULL,
    [contract_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [status_id] INT NOT NULL CONSTRAINT [ContractSites_status_id_df] DEFAULT 1,
    CONSTRAINT [ContractSites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContractSites_contract_id_site_id_key] UNIQUE NONCLUSTERED ([contract_id],[site_id])
);

-- CreateTable
CREATE TABLE [dbo].[ContractSiteServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client_price] DECIMAL(19,4) NOT NULL CONSTRAINT [ContractSiteServices_client_price_df] DEFAULT 0,
    [contract_site_id] INT NOT NULL,
    [service_type_id] INT NOT NULL,
    [service_line_service_id] INT NOT NULL,
    CONSTRAINT [ContractSiteServices_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Employees] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ms_user_id] VARCHAR(100) NOT NULL,
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL,
    [terminated] BIT NOT NULL CONSTRAINT [Employees_terminated_df] DEFAULT 0,
    CONSTRAINT [PK__Employee__3213E83F5DB792B8] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Employees_ms_user_id_key] UNIQUE NONCLUSTERED ([ms_user_id])
);

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

-- CreateTable
CREATE TABLE [dbo].[RoleEntityTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [internal_role_id] INT NOT NULL,
    [entity_type_id] INT NOT NULL,
    CONSTRAINT [RoleEntityTypes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoleEntityTypes_internal_role_id_entity_type_id_key] UNIQUE NONCLUSTERED ([internal_role_id],[entity_type_id])
);

-- CreateTable
CREATE TABLE [dbo].[Notes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [body] VARCHAR(1000) NOT NULL,
    [date] DATETIME2 NOT NULL CONSTRAINT [Notes_date_df] DEFAULT CURRENT_TIMESTAMP,
    [sarlaccId] VARCHAR(50),
    [priority] VARCHAR(10) NOT NULL CONSTRAINT [Notes_priority_df] DEFAULT 'Low',
    [entity_type_id] INT NOT NULL,
    [entity_id] INT NOT NULL,
    [parent_note_id] INT,
    [author_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Notes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
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

-- CreateTable
CREATE TABLE [dbo].[ContactRoles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ContactRoles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContactRoles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EntityTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK__EntityTy__3213E83FE1719A23] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Sites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [store] VARCHAR(100),
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] VARCHAR(50),
    [mailing_zipcode] VARCHAR(10),
    [lat] DECIMAL(32,16),
    [lng] DECIMAL(32,16),
    [client_id] INT NOT NULL,
    [company_id] INT,
    [sandbox] BIT NOT NULL CONSTRAINT [Sites_sandbox_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Sites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [status_id] INT CONSTRAINT [Sites_status_id_df] DEFAULT 3,
    CONSTRAINT [PK__Sites__3213E83F412421E7] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteContacts] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [SiteContacts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100),
    [phone] VARCHAR(100),
    [site_id] INT NOT NULL,
    [contact_role_id] INT NOT NULL,
    CONSTRAINT [SiteContacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteAttachments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [site_id] INT NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [content_type] VARCHAR(100),
    [uploaded_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [SiteAttachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SiteAttachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(30) NOT NULL,
    [description] VARCHAR(100),
    [color] VARCHAR(8),
    CONSTRAINT [SiteStatuses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Vendors] (
    [id] INT NOT NULL IDENTITY(1,1),
    [company] VARCHAR(100) NOT NULL,
    [mailing_address] VARCHAR(150),
    [mailing_address2] VARCHAR(150),
    [mailing_city] VARCHAR(100),
    [mailing_state] VARCHAR(50),
    [mailing_zipcode] VARCHAR(10),
    [lat] DECIMAL(9,6),
    [lng] DECIMAL(9,6),
    [billing_address] VARCHAR(150),
    [billing_address2] VARCHAR(150),
    [billing_city] VARCHAR(100),
    [billing_state] VARCHAR(50),
    [billing_zipcode] VARCHAR(10),
    [status_id] INT NOT NULL,
    [sandbox] BIT NOT NULL CONSTRAINT [Vendors_sandbox_df] DEFAULT 0,
    [sarlaccId] VARCHAR(50),
    [contact_email] VARCHAR(100),
    [contact_name] VARCHAR(100),
    [contact_phone] VARCHAR(20),
    [contact_phone2] VARCHAR(20),
    [quickbooks_id] VARCHAR(100),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Vendors_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Vendors__3213E83F06619C60] PRIMARY KEY CLUSTERED ([id])
);

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

-- CreateTable
CREATE TABLE [dbo].[VendorContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [is_primary] BIT NOT NULL CONSTRAINT [VendorContractSites_is_primary_df] DEFAULT 0,
    [status_id] INT NOT NULL,
    [vendor_id] INT NOT NULL,
    [contract_site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorContractSites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorContractSites_vendor_id_contract_site_id_key] UNIQUE NONCLUSTERED ([vendor_id],[contract_site_id])
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
    [color] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK__VendorSt__3213E83FAC107989] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorTrades] (
    [vendor_id] INT NOT NULL,
    [trade_id] INT NOT NULL,
    CONSTRAINT [PK_VendorTrades] PRIMARY KEY CLUSTERED ([vendor_id],[trade_id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorServicePricing] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_price] DECIMAL(19,4) NOT NULL,
    [contract_site_service_id] INT NOT NULL,
    [vendor_contract_site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorServicePricing_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorServicePricing_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorServicePricing_vendor_contract_site_id_contract_site_service_id_key] UNIQUE NONCLUSTERED ([vendor_contract_site_id],[contract_site_service_id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorComplianceDocuments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [document_type] NVARCHAR(1000) NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [date_completed] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorComplianceDocuments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [sent_by] INT,
    CONSTRAINT [VendorComplianceDocuments_pkey] PRIMARY KEY CLUSTERED ([id])
);

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
CREATE TABLE [dbo].[VendorExhibitContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_exhibit_id] INT NOT NULL,
    [vendor_contract_site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorExhibitContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorExhibitContractSites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorExhibitContractSites_vendor_exhibit_id_vendor_contract_site_id_key] UNIQUE NONCLUSTERED ([vendor_exhibit_id],[vendor_contract_site_id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorCOIs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [expiration_date] DATETIME2 NOT NULL,
    [additionally_insured_verified] BIT NOT NULL CONSTRAINT [VendorCOIs_additionally_insured_verified_df] DEFAULT 0,
    [verified_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorCOIs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorCOIs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorWarnings] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [notice_type] NVARCHAR(1000) NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [sent_by] INT NOT NULL,
    [date_completed] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorWarnings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorWarnings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderMobilizationFees] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [vendor_id] INT NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [status] VARCHAR(40) NOT NULL,
    [notes] VARCHAR(500),
    [pandadoc_id] VARCHAR(100),
    [template_id] VARCHAR(100),
    [date_sent] DATETIME2,
    [date_viewed] DATETIME2,
    [date_completed] DATETIME2,
    [date_paid] DATETIME2,
    [date_declined] DATETIME2,
    [date_voided] DATETIME2,
    [quickbooks_bill_id] VARCHAR(100),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderMobilizationFees_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] INT NOT NULL,
    [sent_by] INT,
    [paid_by] INT,
    CONSTRAINT [WorkOrderMobilizationFees_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrders] (
    [id] INT NOT NULL IDENTITY(1,1),
    [site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrders_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by_email] VARCHAR(100) NOT NULL,
    [msa_id] INT,
    [parent_work_order_id] INT,
    [status_id] INT NOT NULL,
    [vendor_id] INT,
    [work_order_number] VARCHAR(20) NOT NULL,
    [due_date] DATETIME2 NOT NULL CONSTRAINT [WorkOrders_due_date_df] DEFAULT CURRENT_TIMESTAMP,
    [start_date] DATETIME2,
    [type] VARCHAR(50) NOT NULL,
    [external_id] VARCHAR(50),
    [scope_of_work] VARCHAR(1000),
    [software_id] INT,
    [priority] VARCHAR(50),
    [phase] VARCHAR(10) CONSTRAINT [WorkOrders_phase_df] DEFAULT 'ops',
    CONSTRAINT [PK__WorkOrde__3213E83FA1A0BFFC] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WorkOrders_work_order_number_key] UNIQUE NONCLUSTERED ([work_order_number])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(30) NOT NULL,
    [description] VARCHAR(100),
    [color] VARCHAR(8),
    CONSTRAINT [WorkOrderStatuses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [client_price] DECIMAL(10,2),
    [vendor_price] DECIMAL(10,2),
    [is_upsell] BIT NOT NULL CONSTRAINT [DF__WorkOrder__is_up__634EBE90] DEFAULT 0,
    [trade_id] INT NOT NULL,
    CONSTRAINT [PK__WorkOrde__3213E83FF413C92F] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderMSAs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [date_completed] DATETIME2,
    [sent_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderMSAs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [vendor_id] INT NOT NULL,
    CONSTRAINT [WorkOrderMSAs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderAttachments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [content_type] VARCHAR(100),
    [uploaded_by] INT,
    [uploaded_by_vendor] BIT NOT NULL CONSTRAINT [WorkOrderAttachments_uploaded_by_vendor_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderAttachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkOrderAttachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderVendorUpdates] (
    [id] INT NOT NULL IDENTITY(1,1),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderVendorUpdates_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [check_in] DATETIME2,
    [check_in_notes] VARCHAR(1000),
    [check_out] DATETIME2,
    [check_out_notes] VARCHAR(1000),
    [vendor_id] INT NOT NULL,
    [work_order_id] INT NOT NULL,
    CONSTRAINT [WorkOrderVendorUpdates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WorkOrderVendorUpdates_work_order_id_vendor_id_key] UNIQUE NONCLUSTERED ([work_order_id],[vendor_id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderCommunications] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [content] VARCHAR(2000) NOT NULL,
    [sender_type] NVARCHAR(1000) NOT NULL,
    [employee_id] INT,
    [vendor_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderCommunications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkOrderCommunications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_ActivityLog_Entity] ON [dbo].[ActivityLog]([entity_type_id], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RoleAssignments_entity_type_id_entity_id_idx] ON [dbo].[RoleAssignments]([entity_type_id], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RoleAssignments_employee_id_idx] ON [dbo].[RoleAssignments]([employee_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notes_entity_type_id_entity_id_idx] ON [dbo].[Notes]([entity_type_id], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NoteTaggedUsers_tagged_user_id_idx] ON [dbo].[NoteTaggedUsers]([tagged_user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorContacts_vendor_id_idx] ON [dbo].[VendorContacts]([vendor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorContractSites_contract_site_id_idx] ON [dbo].[VendorContractSites]([contract_site_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorServicePricing_contract_site_service_id_idx] ON [dbo].[VendorServicePricing]([contract_site_service_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorComplianceDocuments_vendor_id_document_type_idx] ON [dbo].[VendorComplianceDocuments]([vendor_id], [document_type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorExhibits_vendor_id_idx] ON [dbo].[VendorExhibits]([vendor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorExhibitContractSites_vendor_contract_site_id_idx] ON [dbo].[VendorExhibitContractSites]([vendor_contract_site_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorCOIs_vendor_id_expiration_date_idx] ON [dbo].[VendorCOIs]([vendor_id], [expiration_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorWarnings_vendor_id_idx] ON [dbo].[VendorWarnings]([vendor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderMobilizationFees_work_order_id_idx] ON [dbo].[WorkOrderMobilizationFees]([work_order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderMobilizationFees_pandadoc_id_idx] ON [dbo].[WorkOrderMobilizationFees]([pandadoc_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderMobilizationFees_status_idx] ON [dbo].[WorkOrderMobilizationFees]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderMobilizationFees_vendor_id_idx] ON [dbo].[WorkOrderMobilizationFees]([vendor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderCommunications_work_order_id_idx] ON [dbo].[WorkOrderCommunications]([work_order_id]);

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [ActivityLog_changed_by_fkey] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [FK__ActivityL__entit__70A8B9AE] FOREIGN KEY ([entity_type_id]) REFERENCES [dbo].[EntityTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineServices] ADD CONSTRAINT [ServiceLineServices_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineExhibitTemplates] ADD CONSTRAINT [FK__ServiceLi__servi__690797E6] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Companies] ADD CONSTRAINT [FK__Companies__clien__3E1D39E1] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientContacts] ADD CONSTRAINT [ClientContacts_client_id_fkey] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientContacts] ADD CONSTRAINT [ClientContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLines] ADD CONSTRAINT [FK__ClientSer__clien__47A6A41B] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLines] ADD CONSTRAINT [FK__ClientSer__servi__489AC854] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD CONSTRAINT [FK__ClientSer__clien__6BE40491] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD CONSTRAINT [FK__ClientSer__servi__6CD828CA] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_client_id_fkey] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_service_type_id_fkey] FOREIGN KEY ([service_type_id]) REFERENCES [dbo].[ServiceTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_software_id_fkey] FOREIGN KEY ([software_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contracts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[SiteStatuses]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSiteServices] ADD CONSTRAINT [ContractSiteServices_contract_site_id_fkey] FOREIGN KEY ([contract_site_id]) REFERENCES [dbo].[ContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSiteServices] ADD CONSTRAINT [ContractSiteServices_service_line_service_id_fkey] FOREIGN KEY ([service_line_service_id]) REFERENCES [dbo].[ServiceLineServices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoleAssignments] ADD CONSTRAINT [RoleAssignments_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoleAssignments] ADD CONSTRAINT [RoleAssignments_internal_role_id_fkey] FOREIGN KEY ([internal_role_id]) REFERENCES [dbo].[InternalRoles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PandaDocUserTokens] ADD CONSTRAINT [PandaDocUserTokens_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoleEntityTypes] ADD CONSTRAINT [RoleEntityTypes_internal_role_id_fkey] FOREIGN KEY ([internal_role_id]) REFERENCES [dbo].[InternalRoles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_author_id_fkey] FOREIGN KEY ([author_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_entity_type_id_fkey] FOREIGN KEY ([entity_type_id]) REFERENCES [dbo].[EntityTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_parent_note_id_fkey] FOREIGN KEY ([parent_note_id]) REFERENCES [dbo].[Notes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteTaggedUsers] ADD CONSTRAINT [NoteTaggedUsers_note_id_fkey] FOREIGN KEY ([note_id]) REFERENCES [dbo].[Notes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteTaggedUsers] ADD CONSTRAINT [NoteTaggedUsers_tagged_user_id_fkey] FOREIGN KEY ([tagged_user_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [Sites_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[SiteStatuses]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [FK__Sites__client_id__40F9A68C] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [FK__Sites__company_i__41EDCAC5] FOREIGN KEY ([company_id]) REFERENCES [dbo].[Companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteContacts] ADD CONSTRAINT [SiteContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteContacts] ADD CONSTRAINT [SiteContacts_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteAttachments] ADD CONSTRAINT [SiteAttachments_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Vendors] ADD CONSTRAINT [FK__Vendors__status___44CA3770] FOREIGN KEY ([status_id]) REFERENCES [dbo].[VendorStatuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContacts] ADD CONSTRAINT [VendorContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContacts] ADD CONSTRAINT [VendorContacts_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_contract_site_id_fkey] FOREIGN KEY ([contract_site_id]) REFERENCES [dbo].[ContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[VendorSiteStatuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorTrades] ADD CONSTRAINT [FK__VendorTra__trade__5AB9788F] FOREIGN KEY ([trade_id]) REFERENCES [dbo].[Trades]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorTrades] ADD CONSTRAINT [FK__VendorTra__vendo__59C55456] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorServicePricing] ADD CONSTRAINT [VendorServicePricing_contract_site_service_id_fkey] FOREIGN KEY ([contract_site_service_id]) REFERENCES [dbo].[ContractSiteServices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorServicePricing] ADD CONSTRAINT [VendorServicePricing_vendor_contract_site_id_fkey] FOREIGN KEY ([vendor_contract_site_id]) REFERENCES [dbo].[VendorContractSites]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorComplianceDocuments] ADD CONSTRAINT [VendorComplianceDocuments_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorComplianceDocuments] ADD CONSTRAINT [VendorComplianceDocuments_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibits] ADD CONSTRAINT [VendorExhibits_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibits] ADD CONSTRAINT [VendorExhibits_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibitContractSites] ADD CONSTRAINT [VendorExhibitContractSites_vendor_exhibit_id_fkey] FOREIGN KEY ([vendor_exhibit_id]) REFERENCES [dbo].[VendorExhibits]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorExhibitContractSites] ADD CONSTRAINT [VendorExhibitContractSites_vendor_contract_site_id_fkey] FOREIGN KEY ([vendor_contract_site_id]) REFERENCES [dbo].[VendorContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorCOIs] ADD CONSTRAINT [VendorCOIs_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorCOIs] ADD CONSTRAINT [VendorCOIs_verified_by_fkey] FOREIGN KEY ([verified_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarnings] ADD CONSTRAINT [VendorWarnings_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarnings] ADD CONSTRAINT [VendorWarnings_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMobilizationFees] ADD CONSTRAINT [WorkOrderMobilizationFees_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMobilizationFees] ADD CONSTRAINT [WorkOrderMobilizationFees_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMobilizationFees] ADD CONSTRAINT [WorkOrderMobilizationFees_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMobilizationFees] ADD CONSTRAINT [WorkOrderMobilizationFees_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMobilizationFees] ADD CONSTRAINT [WorkOrderMobilizationFees_paid_by_fkey] FOREIGN KEY ([paid_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [FK__WorkOrder__site___5E8A0973] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_parent_work_order_id_fkey] FOREIGN KEY ([parent_work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_software_id_fkey] FOREIGN KEY ([software_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[WorkOrderStatuses]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [FK__WorkOrder__work___6442E2C9] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [WorkOrderServices_trade_id_fkey] FOREIGN KEY ([trade_id]) REFERENCES [dbo].[Trades]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderAttachments] ADD CONSTRAINT [WorkOrderAttachments_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderVendorUpdates] ADD CONSTRAINT [WorkOrderVendorUpdates_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderVendorUpdates] ADD CONSTRAINT [WorkOrderVendorUpdates_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

