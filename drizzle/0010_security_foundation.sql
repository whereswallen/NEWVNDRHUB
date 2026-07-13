ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id"),
  ADD CONSTRAINT "membership_vendor_role_ck" CHECK ("role" = 'vendor' OR "vendor_id" IS NULL);

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id"),
  ADD CONSTRAINT "inventory_movements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
  ADD CONSTRAINT "inventory_quantity_delta_ck" CHECK ("quantity_delta" <> 0);

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id"),
  ADD CONSTRAINT "sale_amounts_ck" CHECK ("subtotal_cents" >= 0 AND "tax_cents" >= 0 AND "total_cents" = "subtotal_cents" + "tax_cents"),
  ADD CONSTRAINT "sale_payment_method_ck" CHECK ("payment_method" IN ('cash','card','external'));

ALTER TABLE "vendors"
  ADD CONSTRAINT "vendor_commission_rate_ck" CHECK ("commission_rate" >= 0 AND "commission_rate" <= 100);

ALTER TABLE "products"
  ADD CONSTRAINT "product_price_ck" CHECK ("price_cents" > 0),
  ADD CONSTRAINT "product_tax_code_ck" CHECK ("tax_code" IN ('standard','zero','exempt'));
