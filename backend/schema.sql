-- PostgreSQL-compatible persistence shape. Every tenant-owned table carries org_id.
-- The application must set app.current_org_id per transaction before querying.

create table if not exists units (
    id text primary key,
    org_id text not null,
    sku text,
    asin text,
    fnsku text,
    barcode text,
    work_order_id text,
    operator_id text not null,
    created_at timestamptz not null default now()
);

create table if not exists captures (
    id text primary key,
    org_id text not null,
    unit_id text not null references units(id),
    photo_refs jsonb not null default '[]'::jsonb,
    photos jsonb not null default '[]'::jsonb,
    barcode_scan jsonb,
    status text not null check (status in ('complete', 'pending')),
    captured_at timestamptz not null
);

create table if not exists observations (
    id text primary key,
    org_id text not null,
    capture_id text not null references captures(id),
    check_key text not null,
    value text not null,
    confidence numeric,
    visible_text text,
    evidence_locations jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists compliance_checks (
    id text primary key,
    org_id text not null,
    capture_id text not null references captures(id),
    check_key text not null,
    verdict text not null check (verdict in ('PASS', 'FAIL', 'UNCERTAIN')),
    explanation text not null,
    created_at timestamptz not null default now()
);

create table if not exists evidence (
    id text primary key,
    org_id text not null,
    capture_id text not null references captures(id),
    check_id text not null,
    source_type text not null check (source_type in ('mock_observation', 'image')),
    observation text not null,
    source_ref text,
    reference_location text,
    bounding_box jsonb,
    explanation text not null,
    created_at timestamptz not null default now()
);

create table if not exists review_overrides (
    id text primary key,
    org_id text not null,
    unit_id text not null references units(id),
    original_verdict text not null check (original_verdict in ('PASS', 'FAIL', 'UNCERTAIN')),
    new_verdict text not null check (new_verdict in ('PASS', 'FAIL', 'UNCERTAIN')),
    reason text not null,
    operator_id text not null,
    timestamp timestamptz not null
);

-- RLS is enabled and forced on every tenant-owned table.
-- The setting is intentionally scoped per transaction rather than using a shared default.
do $$
declare table_name text;
begin
    foreach table_name in array array['units', 'captures', 'observations', 'compliance_checks', 'evidence', 'review_overrides'] loop
        execute format('alter table %I enable row level security', table_name);
        execute format('alter table %I force row level security', table_name);
        execute format('create policy %I_org_isolation on %I using (org_id = current_setting(''app.current_org_id'', true)) with check (org_id = current_setting(''app.current_org_id'', true))', table_name, table_name);
    end loop;
end $$;
