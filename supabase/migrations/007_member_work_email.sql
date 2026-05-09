-- Migration: 007_member_work_email
-- Adds an optional work email field to members.
-- Nullable, no unique constraint — multiple members may share an address.

alter table members add column if not exists work_email text;
