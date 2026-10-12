-- Use "W9" everywhere. sendW9 stores "W9" and every row in
-- VendorComplianceDocuments already says "W9", but vw_SourcingGrid and
-- vw_SourcingGridVendors looked for 'W-9', so the sourcing grid never saw a
-- completed W-9.
--
-- Rewrites each view from its CURRENT definition in the database (so nothing
-- else in the view changes), swapping 'W-9' for 'W9'. CREATE → ALTER keeps
-- permissions. EXEC because Prisma runs the migration as one batch.

DECLARE @def NVARCHAR(MAX);

SET @def = OBJECT_DEFINITION(OBJECT_ID(N'dbo.vw_SourcingGrid'));
IF @def IS NOT NULL AND CHARINDEX(N'''W-9''', @def) > 0
BEGIN
    SET @def = REPLACE(@def, N'''W-9''', N'''W9''');
    SET @def = STUFF(@def, CHARINDEX(N'CREATE', @def), 6, N'ALTER');
    EXEC(@def);
END;

SET @def = OBJECT_DEFINITION(OBJECT_ID(N'dbo.vw_SourcingGridVendors'));
IF @def IS NOT NULL AND CHARINDEX(N'''W-9''', @def) > 0
BEGIN
    SET @def = REPLACE(@def, N'''W-9''', N'''W9''');
    SET @def = STUFF(@def, CHARINDEX(N'CREATE', @def), 6, N'ALTER');
    EXEC(@def);
END;

-- Just in case a "W-9" row is ever added by hand before the code ships.
UPDATE [dbo].[VendorComplianceDocuments]
SET [document_type] = 'W9'
WHERE [document_type] IN ('W-9', 'w-9', 'w9');