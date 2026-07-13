import assert from "node:assert/strict";
import test from "node:test";
import { hasBillingAccess } from "../src/lib/billing";
import { hasPermission } from "../src/lib/permissions";

test("suspended organizations fail closed even when a plan is otherwise active",()=>{
  assert.equal(hasBillingAccess({status:"suspended",billingStatus:"active",trialEndsAt:null}),false);
});

test("vendor permissions cannot be expanded into POS access",()=>{
  assert.equal(hasPermission("vendor","pos:sell",{}),false);
  assert.equal(hasPermission("vendor","pos:sell",{"pos:sell":true}),false);
});

test("only explicit owner or platform roles hold billing permissions",()=>{
  assert.equal(hasPermission("owner","billing:manage",{}),true);
  assert.equal(hasPermission("manager","billing:manage",{}),false);
  assert.equal(hasPermission("staff","billing:manage",{}),false);
});
