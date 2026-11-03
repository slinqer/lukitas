-- Runtime role for the API. Not a superuser and cannot bypass row-level security.
-- The password is for local development and tests only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wambito_app') THEN
    CREATE ROLE wambito_app LOGIN PASSWORD 'wambito_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO wambito_app;
-- Tables and sequences the API creates later (migrations run as the admin role) reach the role
-- without a grant step in development; production uses grantAppRole in the bootstrap.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wambito_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO wambito_app;
