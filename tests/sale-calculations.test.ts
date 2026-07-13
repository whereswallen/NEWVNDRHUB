import assert from "node:assert/strict";
import test from "node:test";
import { calculateLine } from "../src/lib/sale-calculations";

test("sale line snapshots tax commission and vendor net",()=>{
  const line=calculateLine({unitPriceCents:2000,quantity:2,commissionRate:20,taxable:true,taxes:[{name:"GST",rate:5},{name:"PST",rate:7}]});
  assert.equal(line.subtotalCents,4000);
  assert.equal(line.taxCents,480);
  assert.equal(line.commissionCents,800);
  assert.equal(line.vendorNetCents,3200);
  assert.deepEqual(line.taxBreakdown,[{name:"GST",rate:5,amountCents:200},{name:"PST",rate:7,amountCents:280}]);
});

test("exempt line has no tax",()=>{
  const line=calculateLine({unitPriceCents:999,quantity:1,commissionRate:15,taxable:false,taxes:[{name:"HST",rate:13}]});
  assert.equal(line.taxCents,0);
  assert.deepEqual(line.taxBreakdown,[]);
});
