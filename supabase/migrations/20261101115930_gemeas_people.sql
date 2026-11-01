-- A second person on the same app. Two things become per person, in her profile:
-- whether the app follows the foot, and whose video list she reads.
-- Only an admin changes them: logged-in people can read these columns, never write them.

alter table gemeas.coach_profiles
  add column tracks_foot boolean not null default false,
  add column videos_from uuid references auth.users on delete set null; -- reads this person's list too, never changes it

-- Who is here today follows the foot
update gemeas.coach_profiles set tracks_foot = true;

grant select (tracks_foot, videos_from) on gemeas.coach_profiles to authenticated;

create policy "Video list shared with this person" on gemeas.videos for select to authenticated
  using (user_id = (select p.videos_from from gemeas.coach_profiles p where p.user_id = (select auth.uid())));
