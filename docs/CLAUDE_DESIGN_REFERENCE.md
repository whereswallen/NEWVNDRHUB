# VNDR Hub complete design reference

This document is the visual and product reference for an AI collaborator. Read it before changing layouts, navigation, page hierarchy, or core user flows.

## Product

VNDR Hub is a Canadian consignment retail SaaS. Store owners manage storefronts, vendors, rental spaces, inventory, POS sales, refunds, vendor payouts, staff access, subscriptions, and Square connections. Vendors have a deliberately isolated portal for their inventory, sales, and payouts.

The product is designed as a calm, professional retail operations system. It should feel dependable and simple, not flashy or consumer-social.

## Visual language

| Element | Design direction |
| --- | --- |
| Font | `Inter`, then system sans-serif fallback |
| Main ink | `#171b20` |
| Accent red | `#e30613` |
| Canvas | `#f5f6f8` |
| Cards | White, thin `#e3e6ea` border, 14 to 18px rounded corners |
| Primary button | Solid accent red, white text, 8px radius |
| Secondary button | White, thin grey border |
| Success notice | Pale green with green border |
| Error notice | Pale red with dark red text |
| Data density | Medium. Use concise list rows with a title, muted secondary line, and a right-aligned metric or action. |
| Branding | `VNDR Hub`, with `Hub` in accent red. Heavy, compact wordmark. |

Do not replace the red accent with blue, purple, gradients, glassmorphism, oversized illustrations, or a radically different dashboard aesthetic.

## Layout patterns

### Marketing and authentication

- Soft-grey full-page canvas
- Large centred white card
- Generous whitespace
- Large black headline with a small uppercase red eyebrow
- Simple top navigation for the landing page
- Authentication cards are narrow and centred

### Authenticated app

- Desktop has a fixed-width white left sidebar, approximately 230px
- Main content uses a soft-grey canvas with wide white cards
- Desktop content is capped around 1100 to 1180px
- Header has page title on the left and contextual action on the right
- Mobile hides the sidebar and stacks grids and forms into one column
- Use `management-card`, `metric-grid`, `data-list`, and `inline-form` patterns consistently

## Public and account routes

| Route | Page and intent |
| --- | --- |
| `/` | Marketing landing page. Explains the product and leads to signup. |
| `/sign-up` | Owner account creation. |
| `/sign-in` | Existing user sign-in. |
| `/forgot-password` | Password reset request. |
| `/reset-password` | Set a replacement password. |
| `/verify-email` | Verify account email. |
| `/onboarding` | Owner creates organization, first store, province, timezone, and chooses Standard or Unlimited trial. |
| `/invite/[token]` | Employee or vendor invitation acceptance. |

## App workspace routes

All routes below use the same left-navigation workspace design and are tenant scoped.

| Route | Role access | Main content |
| --- | --- | --- |
| `/app` | All active memberships | Role-aware dashboard. Shows organization, plan, vendor allowance, role, and navigation. |
| `/app/setup` | Owner and permitted managers | Storefronts, receipt identity, taxes, rental spaces, vendors, vendor invitations, setup checklist. |
| `/app/inventory` | Owner, manager, staff read, vendor own inventory | Product list, stock quantity, add product, adjustment form, CSV import for permitted users. |
| `/app/pos` | Owner, manager, staff with POS access | Product search and grid on left, cart and cash checkout on right. Multiple storefront selector for organization-wide users. |
| `/app/sales` | Sales readers | Searchable recent sales list with amount, status, payment method, cashier, and storefront. |
| `/app/sales/[saleId]` | Sales readers in matching store | Printable receipt. Cash refunds only until processor-confirmed card refunds exist. |
| `/app/reports` | Payout/report readers | Monthly vendor sales, refunds, commission, rent, tax, and estimated settlement view. |
| `/app/payouts` | Payout readers, owner finalization | Finalized vendor payout records, mark-paid workflow, CSV export. |
| `/app/team` | Team readers and managers | Active staff list, role/store scope, pending invitations, invitation revocation. |
| `/app/billing` | Owner | Plan, trial/billing state, storefront quantity, Stripe checkout and billing portal. |
| `/app/integrations` | Store managers | Store-by-store Square OAuth connection and Square Terminal device IDs. |

## Vendor portal routes

| Route | Main content |
| --- | --- |
| `/vendor` | Vendor-specific dashboard with current month gross sales, commission, estimated payout after rent, rental assignment, own inventory, and own sales. |
| `/vendor/payouts` | Vendor-only payout history. |

Vendor accounts must never see POS, other vendors, organization billing, team, other stores, or platform administration.

## Platform administration

| Route | Main content |
| --- | --- |
| `/platform` | VNDR Hub platform-admin view with organization, store, and vendor counts plus customer list. TOTP MFA enrollment appears here before production MFA enforcement. |

This route is visually consistent with management pages but represents platform scope, not customer scope.

## Critical workflows

1. Owner signup → onboarding → create organization → create first storefront → trial starts.
2. Owner creates vendor → assigns rent/commission → sends email-locked invitation.
3. Owner/manager/vendor adds product → initial inventory movement is recorded.
4. Staff scans/searches product → cash sale → stock decrement → commission and tax snapshot → receipt.
5. Owner/manager reviews sales → cash refund where appropriate → optional stock restock.
6. Owner finalizes vendor monthly payout → immutable snapshot → records e-transfer/cheque/manual payment.
7. Owner connects Square per storefront through OAuth. Card flows remain disabled until processor confirmation is fully implemented.

## Security design constraints

- All visible navigation is secondary to server-side authorization.
- Suspended or past-due organizations should be redirected to billing, except for billing restoration actions.
- Use organization and storefront scope in every data view.
- Avoid browser prompts. Use accessible forms, labels, validation, and clear error messages.
- The platform admin should enrol TOTP before production enforcement.
- Do not re-enable unverified card or external-payment completion in the POS UI.

## Important source files

| Purpose | Path |
| --- | --- |
| Global visual system | `src/app/globals.css` |
| Public landing page | `src/app/page.tsx` |
| Workspace home | `src/app/app/page.tsx` |
| POS component | `src/components/pos/register.tsx` |
| Authorization boundary | `src/lib/access.ts` |
| Roles and permissions | `src/lib/permissions.ts` |
| Database model | `src/db/schema.ts` |

## Recommended way for Claude to review the visual design

1. Open this file first.
2. Open `src/app/globals.css` for tokens and responsive rules.
3. Open the relevant `page.tsx` route and supporting component.
4. Use the route table above to understand the user role and flow before editing.
5. When a staging server exists, review the staging URL in a browser alongside this document. A live staging URL is the best way for any AI to understand the full experience, especially responsive behaviour and post-login pages.
