import test from "node:test";import assert from "node:assert/strict";
import {hasBillingAccess,storefrontQuantity} from "../src/lib/billing";
test("active paid organizations retain access",()=>assert.equal(hasBillingAccess({status:"active",billingStatus:"active",trialEndsAt:null}),true));
test("expired trials are blocked",()=>assert.equal(hasBillingAccess({status:"active",billingStatus:"trialing",trialEndsAt:new Date("2025-01-01")},new Date("2025-01-02")),false));
test("past due and suspended organizations are blocked",()=>{assert.equal(hasBillingAccess({status:"active",billingStatus:"past_due",trialEndsAt:null}),false);assert.equal(hasBillingAccess({status:"suspended",billingStatus:"active",trialEndsAt:null}),false)});
test("only additional storefronts are billed",()=>{assert.equal(storefrontQuantity(1),0);assert.equal(storefrontQuantity(4),3)});
