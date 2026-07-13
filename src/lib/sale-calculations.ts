import { percentageOfCents } from "./money";

export type TaxComponent={name:string;rate:number};
export function calculateLine(input:{unitPriceCents:number;quantity:number;commissionRate:number;taxable:boolean;taxes:TaxComponent[]}){
  const subtotalCents=input.unitPriceCents*input.quantity;
  const taxBreakdown=input.taxable?input.taxes.map(tax=>({name:tax.name,rate:tax.rate,amountCents:percentageOfCents(subtotalCents,tax.rate)})):[];
  const taxCents=taxBreakdown.reduce((sum,tax)=>sum+tax.amountCents,0);
  const commissionCents=percentageOfCents(subtotalCents,input.commissionRate);
  return{subtotalCents,taxBreakdown,taxCents,commissionCents,vendorNetCents:subtotalCents-commissionCents};
}
