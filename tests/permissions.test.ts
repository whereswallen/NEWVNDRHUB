import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "../src/lib/permissions";

test("staff can use POS without owner access",()=>{
  assert.equal(hasPermission("staff","pos:sell"),true);
  assert.equal(hasPermission("staff","team:manage"),false);
  assert.equal(hasPermission("staff","payouts:read"),false);
});

test("vendors cannot use POS",()=>{
  assert.equal(hasPermission("vendor","pos:sell"),false);
  assert.equal(hasPermission("vendor","own_inventory:write"),true);
});

test("owner can manage team and custom overrides take precedence",()=>{
  assert.equal(hasPermission("owner","team:manage"),true);
  assert.equal(hasPermission("owner","pos:sell",{"pos:sell":false}),false);
});

test("platform admin has global permissions",()=>{
  assert.equal(hasPermission("platform_admin","platform:customers:read"),true);
});
