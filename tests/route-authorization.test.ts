import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const protectedRoutes=[
  "src/app/app/page.tsx",
  "src/app/app/billing/page.tsx",
  "src/app/app/inventory/page.tsx",
  "src/app/app/pos/page.tsx",
  "src/app/app/sales/page.tsx",
  "src/app/app/sales/[saleId]/page.tsx",
  "src/app/app/setup/page.tsx",
  "src/app/app/team/page.tsx",
  "src/app/app/integrations/page.tsx",
  "src/app/app/reports/page.tsx",
  "src/app/app/payouts/page.tsx",
];

test("protected workspace pages use the central authorization boundary",async()=>{
  for(const route of protectedRoutes){
    const source=await readFile(route,"utf8");
    assert.match(source,/requireCurrentOrganization(?:Access|Permission)|requireStorePermission/);
  }
});

test("vendor pages use the isolated vendor authorization boundary",async()=>{
  for(const route of ["src/app/vendor/page.tsx","src/app/vendor/payouts/page.tsx"]){
    assert.match(await readFile(route,"utf8"),/requireVendorAccess/);
  }
});
