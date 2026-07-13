export function percentageOfCents(amountCents:number,ratePercent:number){return Math.round(amountCents*ratePercent/100)}
export function formatCad(amountCents:number){return new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(amountCents/100)}
