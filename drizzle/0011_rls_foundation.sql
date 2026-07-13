-- Tenant policies are deliberately created before they are enabled. Enable them only
-- after the application has been deployed with per-request tenant context support.
CREATE SCHEMA IF NOT EXISTS vndrhub;

CREATE OR REPLACE FUNCTION vndrhub.current_organization_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION vndrhub.current_store_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.store_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION vndrhub.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION vndrhub.tenant_visible(organization uuid, store uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT organization = vndrhub.current_organization_id()
    AND (vndrhub.current_store_id() IS NULL OR store IS NULL OR store = vndrhub.current_store_id())
$$;

CREATE POLICY organizations_tenant_isolation ON organizations
  USING (id = vndrhub.current_organization_id())
  WITH CHECK (id = vndrhub.current_organization_id());

CREATE POLICY stores_tenant_isolation ON stores
  USING (vndrhub.tenant_visible(organization_id, id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, id));

CREATE POLICY vendors_tenant_isolation ON vendors
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY products_tenant_isolation ON products
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY inventory_movements_tenant_isolation ON inventory_movements
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY sales_tenant_isolation ON sales
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY refunds_tenant_isolation ON refunds
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY payouts_tenant_isolation ON payouts
  USING (vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (vndrhub.tenant_visible(organization_id, store_id));

CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (organization_id IS NULL OR vndrhub.tenant_visible(organization_id, store_id))
  WITH CHECK (organization_id IS NULL OR vndrhub.tenant_visible(organization_id, store_id));

REVOKE ALL ON SCHEMA vndrhub FROM PUBLIC;
GRANT USAGE ON SCHEMA vndrhub TO vndrhub_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vndrhub_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vndrhub_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vndrhub_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vndrhub_app;
