BEGIN TRY

BEGIN TRAN;

-- Ensure only one DRAFT revision per item
CREATE UNIQUE NONCLUSTERED INDEX bom_headers_single_draft_idx 
ON bom_headers (parent_item_id) 
WHERE status = 'DRAFT';

-- Ensure only one ACTIVE revision per item
CREATE UNIQUE NONCLUSTERED INDEX bom_headers_single_active_idx 
ON bom_headers (parent_item_id) 
WHERE status = 'ACTIVE';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH