-- The sync function writes activities with the service role: only this table, only this schema.
grant usage on schema gemeas to service_role;
grant select, insert, update, delete on gemeas.activities to service_role;
