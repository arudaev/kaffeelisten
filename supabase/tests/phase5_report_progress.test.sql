-- Migration 040: run progress and the append-only delivery event log.
-- Self-contained and rolled back.

begin;

set role service_role;

do $$
begin
  insert into email_delivery_events (resend_message_id, event, occurred_at)
  values ('msg-040', 'delivered', now());
  if (select count(*) from email_delivery_events where resend_message_id = 'msg-040') <> 1 then
    raise exception '040: service_role could not record a delivery event';
  end if;

  insert into report_runs (report_month, status, progress)
  values ('2099-01', 'running', '{"phase":"people"}');
  update report_runs set progress = '{"phase":"done"}' where report_month = '2099-01';

  begin
    update email_delivery_events set event = 'bounced' where resend_message_id = 'msg-040';
    raise exception '040: delivery events must be append-only (update allowed)';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from email_delivery_events where resend_message_id = 'msg-040';
    raise exception '040: delivery events must be append-only (delete allowed)';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  040 service_role records progress and delivery events, append-only';
end $$;

reset role;
set role anon;

do $$
begin
  begin
    perform 1 from email_delivery_events;
    raise exception '040: anon can read delivery events';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  040 anon cannot read delivery events';
end $$;

reset role;

do $$
begin
  begin
    insert into email_delivery_events (resend_message_id, event, occurred_at) values ('m', 'opened', now());
    raise exception '040: unknown event accepted';
  exception when check_violation then null;
  end;
  raise notice 'ok  040 event constraint';
end $$;

rollback;
