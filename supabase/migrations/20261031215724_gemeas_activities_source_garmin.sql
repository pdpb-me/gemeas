-- Activities can also come from Garmin's Personal API.
alter table gemeas.activities drop constraint activities_source_check;
alter table gemeas.activities add constraint activities_source_check check (source in ('manual', 'intervals', 'garmin'));
