/*
  Warnings:

  - A unique constraint covering the columns `[bom_header_id,component_item_id]` on the table `bom_components` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[bom_components] ADD CONSTRAINT [bom_components_bom_header_id_component_item_id_key] UNIQUE NONCLUSTERED ([bom_header_id], [component_item_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
