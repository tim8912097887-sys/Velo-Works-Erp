BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[items] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [item_code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [item_type] VARCHAR(30) NOT NULL,
    [unit_of_measure] VARCHAR(20) NOT NULL,
    [make_buy] VARCHAR(20) NOT NULL,
    [lead_time_days] INT NOT NULL CONSTRAINT [items_lead_time_days_df] DEFAULT 0,
    [safety_stock] DECIMAL(18,3) NOT NULL CONSTRAINT [items_safety_stock_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [items_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [items_item_code_key] UNIQUE NONCLUSTERED ([item_code])
);

-- CreateTable
CREATE TABLE [dbo].[bom_headers] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [parent_item_id] UNIQUEIDENTIFIER NOT NULL,
    [revision] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [effective_from] DATE NOT NULL,
    [effective_to] DATE,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [bom_headers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [bom_headers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [bom_headers_parent_item_id_revision_key] UNIQUE NONCLUSTERED ([parent_item_id],[revision])
);

-- CreateTable
CREATE TABLE [dbo].[bom_components] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [bom_header_id] UNIQUEIDENTIFIER NOT NULL,
    [component_item_id] UNIQUEIDENTIFIER NOT NULL,
    [quantity_per] DECIMAL(18,6) NOT NULL,
    [scrap_rate] DECIMAL(9,6) NOT NULL CONSTRAINT [bom_components_scrap_rate_df] DEFAULT 0,
    [operation_seq] INT,
    CONSTRAINT [bom_components_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[routings] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [item_id] UNIQUEIDENTIFIER NOT NULL,
    [revision] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    CONSTRAINT [routings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [routings_item_id_revision_key] UNIQUE NONCLUSTERED ([item_id],[revision])
);

-- CreateTable
CREATE TABLE [dbo].[routing_operations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [routing_id] UNIQUEIDENTIFIER NOT NULL,
    [operation_seq] INT NOT NULL,
    [work_center_id] UNIQUEIDENTIFIER NOT NULL,
    [setup_minutes] DECIMAL(10,2) NOT NULL CONSTRAINT [routing_operations_setup_minutes_df] DEFAULT 0,
    [run_minutes_per_unit] DECIMAL(10,4) NOT NULL,
    CONSTRAINT [routing_operations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [routing_operations_routing_id_operation_seq_key] UNIQUE NONCLUSTERED ([routing_id],[operation_seq])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [items_item_type_active_idx] ON [dbo].[items]([item_type], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bom_headers_parent_item_id_status_idx] ON [dbo].[bom_headers]([parent_item_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bom_components_bom_header_id_idx] ON [dbo].[bom_components]([bom_header_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bom_components_component_item_id_idx] ON [dbo].[bom_components]([component_item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [routings_item_id_status_idx] ON [dbo].[routings]([item_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [routing_operations_work_center_id_idx] ON [dbo].[routing_operations]([work_center_id]);

-- AddForeignKey
ALTER TABLE [dbo].[bom_headers] ADD CONSTRAINT [bom_headers_parent_item_id_fkey] FOREIGN KEY ([parent_item_id]) REFERENCES [dbo].[items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bom_components] ADD CONSTRAINT [bom_components_bom_header_id_fkey] FOREIGN KEY ([bom_header_id]) REFERENCES [dbo].[bom_headers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bom_components] ADD CONSTRAINT [bom_components_component_item_id_fkey] FOREIGN KEY ([component_item_id]) REFERENCES [dbo].[items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[routings] ADD CONSTRAINT [routings_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[routing_operations] ADD CONSTRAINT [routing_operations_routing_id_fkey] FOREIGN KEY ([routing_id]) REFERENCES [dbo].[routings]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
