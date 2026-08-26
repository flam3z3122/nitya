/*
# Allow one profile per authenticated user

## Summary
Removes the old single-tenant boolean primary key from `profile_settings`.
The multi-user migration already added `user_id` and a unique index for ownership;
this change removes the obsolete `id` primary-key constraint so separate users can
create separate profile rows without colliding on the old shared key.

## Security
The existing authenticated owner-scoped SELECT, INSERT, UPDATE, and DELETE
policies remain unchanged and continue to use `auth.uid() = user_id`.

## Important Notes
- No profile columns are deleted.
- The old `id` value remains available for compatibility but is no longer the key.
- `user_id` is the unique per-account profile identifier.
*/

ALTER TABLE public.profile_settings DROP CONSTRAINT IF EXISTS profile_settings_pkey;
