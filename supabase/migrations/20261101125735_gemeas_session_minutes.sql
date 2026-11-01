-- How long a walk, run or ride was, if she wrote it after logging it.
alter table gemeas.session_logs
  add column minutes integer check (minutes between 1 and 600);
