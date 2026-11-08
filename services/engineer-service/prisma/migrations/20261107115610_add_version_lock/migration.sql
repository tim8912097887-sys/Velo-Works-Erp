BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[bom_headers] ADD [version] INT NOT NULL CONSTRAINT [bom_headers_version_df] DEFAULT 1;

-- AlterTable
ALTER TABLE [dbo].[items] ADD [version] INT NOT NULL CONSTRAINT [items_version_df] DEFAULT 1;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
