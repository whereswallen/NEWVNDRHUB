import test from "node:test"; import assert from "node:assert/strict"; import {additionalStorefrontCostCents,canAddVendor} from "../src/lib/entitlements";
test("standard plan stops at 40 vendors",()=>{assert.equal(canAddVendor("standard",39),true);assert.equal(canAddVendor("standard",40),false)});
test("unlimited plan has no vendor cap",()=>assert.equal(canAddVendor("unlimited",100000),true));
test("first storefront is included",()=>{assert.equal(additionalStorefrontCostCents(1),0);assert.equal(additionalStorefrontCostCents(2),2000);assert.equal(additionalStorefrontCostCents(4),6000)});
