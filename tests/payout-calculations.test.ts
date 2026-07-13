import assert from "node:assert/strict";
import test from "node:test";
import { calculatePayoutSnapshot, payoutMonth } from "../src/lib/payout-calculations";

test("payout snapshot reconciles sales refunds commission and rent",()=>{const result=calculatePayoutSnapshot([{subtotalCents:10000,taxCents:1300,commissionCents:2000}],[{subtotalCents:2000,taxCents:260,commissionCents:400}],1500);assert.deepEqual(result,{grossSalesCents:10000,refundsCents:2000,commissionCents:1600,rentCents:1500,taxCents:1040,netPayoutCents:4900})});

test("payout month uses an exclusive UTC end",()=>{const range=payoutMonth("2026-02");assert.equal(range.start.toISOString(),"2026-02-01T00:00:00.000Z");assert.equal(range.end.toISOString(),"2026-03-01T00:00:00.000Z")});
