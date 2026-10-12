-- Sarlac → Sarlacc (typo in softwares_internal_flag and handoff_checklist seeds)
UPDATE [dbo].[Softwares]
SET [name] = 'Sarlacc'
WHERE [name] = 'Sarlac' AND [is_internal] = 1;

UPDATE [dbo].[HandoffChecklistItems]
SET [label] = 'Sarlacc / UtilizeCore record closed'
WHERE [key] = 'internal_record_closed';