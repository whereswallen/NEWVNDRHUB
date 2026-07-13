export function calculateRefundPortion(input:{originalQuantity:number;refundQuantity:number;alreadyRefundedQuantity:number;originalSubtotalCents:number;originalTaxCents:number;originalCommissionCents:number;originalVendorNetCents:number;alreadyRefundedTaxCents:number;alreadyRefundedCommissionCents:number;alreadyRefundedVendorNetCents:number}){
  const remainingQuantity=input.originalQuantity-input.alreadyRefundedQuantity;if(input.refundQuantity<1||input.refundQuantity>remainingQuantity)throw new Error("Invalid refund quantity");const finalRefund=input.refundQuantity===remainingQuantity;
  const subtotalCents=Math.round(input.originalSubtotalCents*input.refundQuantity/input.originalQuantity);
  const taxCents=finalRefund?input.originalTaxCents-input.alreadyRefundedTaxCents:Math.round(input.originalTaxCents*input.refundQuantity/input.originalQuantity);
  const commissionCents=finalRefund?input.originalCommissionCents-input.alreadyRefundedCommissionCents:Math.round(input.originalCommissionCents*input.refundQuantity/input.originalQuantity);
  const vendorNetCents=finalRefund?input.originalVendorNetCents-input.alreadyRefundedVendorNetCents:Math.round(input.originalVendorNetCents*input.refundQuantity/input.originalQuantity);
  return{subtotalCents,taxCents,commissionCents,vendorNetCents,totalCents:subtotalCents+taxCents};
}
