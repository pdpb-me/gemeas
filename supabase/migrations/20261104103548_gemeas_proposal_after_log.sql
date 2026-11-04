-- Applica doesn't change a session she logged after the coach proposed the change: the
-- proposal is 'stale', and she can ask again. Same function, one more check.

create or replace function gemeas.decide_proposal(p_id uuid, p_apply boolean)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal gemeas.plan_proposals%rowtype;
  change json;
  was json;
  next json;
  session gemeas.plan_sessions%rowtype;
  note gemeas.reviews%rowtype;
begin
  select * into proposal from gemeas.plan_proposals where id = p_id for update;
  if not found then raise exception 'Proposta non trovata'; end if;
  if proposal.status <> 'pending' then return proposal.status; end if;

  if not p_apply then
    update gemeas.plan_proposals set status = 'declined', decided_at = now() where id = p_id;
    return 'declined';
  end if;

  -- First check everything, so that it's all or nothing
  for change in select * from json_array_elements(proposal.changes) loop
    was := change -> 'before';
    next := change -> 'after';

    if change ->> 'op' in ('change', 'remove') then
      select * into session from gemeas.plan_sessions where id = (change ->> 'session_id')::uuid for update;
      if not found
        or jsonb_build_object(
             'date', session.date, 'slot', session.slot, 'position', session.position, 'kind', session.kind,
             'title', session.title, 'instructions', session.instructions,
             'exercises', session.exercises, 'video_ids', session.video_ids
           ) <> was::jsonb
        or (change ->> 'op' = 'remove' and exists (select 1 from gemeas.session_logs l where l.plan_session_id = session.id))
        -- she logged it (or changed its log) after the coach proposed: the coach didn't know
        or exists (select 1 from gemeas.session_logs l where l.plan_session_id = session.id and l.logged_at > proposal.created_at)
      then
        update gemeas.plan_proposals set status = 'stale', decided_at = now() where id = p_id;
        return 'stale';
      end if;
    end if;

    if change ->> 'op' in ('change', 'add')
      and exists (
        select 1 from json_array_elements_text(next -> 'video_ids') v(yt_id)
        where not exists (select 1 from gemeas.videos g where g.yt_id = v.yt_id)
      )
    then
      update gemeas.plan_proposals set status = 'stale', decided_at = now() where id = p_id;
      return 'stale';
    end if;

    if change ->> 'op' = 'note' then
      select * into note from gemeas.reviews where week_start = (next ->> 'week_start')::date;
      if (case when found then jsonb_build_object('summary', note.summary, 'decisions', note.decisions) else 'null'::jsonb end) <> was::jsonb then
        update gemeas.plan_proposals set status = 'stale', decided_at = now() where id = p_id;
        return 'stale';
      end if;
    end if;
  end loop;

  for change in select * from json_array_elements(proposal.changes) loop
    next := change -> 'after';

    if change ->> 'op' = 'change' then
      update gemeas.plan_sessions set
        date = (next ->> 'date')::date,
        slot = next ->> 'slot',
        position = (next ->> 'position')::integer,
        kind = next ->> 'kind',
        title = next ->> 'title',
        instructions = next ->> 'instructions',
        exercises = array(select json_array_elements_text(next -> 'exercises')),
        video_ids = array(select json_array_elements_text(next -> 'video_ids'))
      where id = (change ->> 'session_id')::uuid;
      -- what she logged moves with the session
      update gemeas.symptoms set date = (next ->> 'date')::date
        where session_log_id in (select l.id from gemeas.session_logs l where l.plan_session_id = (change ->> 'session_id')::uuid);
      update gemeas.tests set date = (next ->> 'date')::date where plan_session_id = (change ->> 'session_id')::uuid;

    elsif change ->> 'op' = 'add' then
      insert into gemeas.plan_sessions (date, slot, position, kind, title, instructions, exercises, video_ids)
      values (
        (next ->> 'date')::date, next ->> 'slot', (next ->> 'position')::integer, next ->> 'kind', next ->> 'title', next ->> 'instructions',
        array(select json_array_elements_text(next -> 'exercises')),
        array(select json_array_elements_text(next -> 'video_ids'))
      );

    elsif change ->> 'op' = 'remove' then
      delete from gemeas.plan_sessions where id = (change ->> 'session_id')::uuid;

    elsif change ->> 'op' = 'note' then
      insert into gemeas.reviews (week_start, summary, decisions)
      values ((next ->> 'week_start')::date, next ->> 'summary', next ->> 'decisions')
      on conflict (user_id, week_start) do update set summary = excluded.summary, decisions = excluded.decisions;

    else
      raise exception 'Modifica sconosciuta: %', change ->> 'op';
    end if;
  end loop;

  update gemeas.plan_proposals set status = 'applied', decided_at = now() where id = p_id;
  return 'applied';
end
$$;
