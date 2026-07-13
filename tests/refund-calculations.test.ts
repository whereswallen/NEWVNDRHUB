import assert from "node:assert/strict";
import test from "node:test";
import { calculateRefundPortion } from "../src/lib/refund-calculations";

test("partial refund reverses proportional accounting",()=>{const result=calculateRefundPortion({originalQuantity:3,refundQuantity:1,alreadyRefundedQuantity:0,originalSubtotalCents:3000,originalTaxCents:390,originalCommissionCents:600,originalVendorNetCents:2400,alreadyRefundedTaxCents:0,alreadyRefundedCommissionCents:0,alreadyRefundedVendorNetCents:0});assert.deepEqual(result,{subtotalCents:1000,taxCents:130,commissionCents:200,vendorNetCents:800,totalCents:1130})});

test("final refund consumes remaining cents",()=>{const result=calculateRefundPortion({originalQuantity:3,refundQuantity:2,alreadyRefundedQuantity:1,originalSubtotalCents:1000,originalTaxCents:131,originalCommissionCents:201,originalVendorNetCents:799,alreadyRefundedTaxCents:44,alreadyRefundedCommissionCents:67,alreadyRefundedVendorNetCents:266});assert.equal(result.taxCents,87);assert.equal(result.commissionCents,134);assert.equal(result.vendorNetCents,533)});

test("refund cannot exceed remaining quantity",()=>{assert.throws(()=>calculateRefundPortion({originalQuantity:1,refundQuantity:1,alreadyRefundedQuantity:1,originalSubtotalCents:100,originalTaxCents:13,originalCommissionCents:20,originalVendorNetCents:80,alreadyRefundedTaxCents:13,alreadyRefundedCommissionCents:20,alreadyRefundedVendorNetCents:80}))});
