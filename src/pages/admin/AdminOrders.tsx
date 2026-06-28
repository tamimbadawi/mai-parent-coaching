import { Package, ShoppingBag, Tag } from 'lucide-react';
import { shopProducts } from '../../data/content';
import AdminLayout from './AdminLayout';
import { Panel, StatCard } from './admin-ui';

// Orders management: Connect a shop_orders table in Supabase to show real order data.
// Currently displays the product catalogue with a placeholder orders panel.

const AdminOrders = (): JSX.Element => {
  const averagePrice = shopProducts.length === 0 ? 0 : shopProducts.reduce((sum, product) => sum + product.price, 0) / shopProducts.length;

  return (
    <AdminLayout title="Shop & Orders">
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Order history requires a <code className="font-mono">shop_orders</code> table in
          Supabase. This view shows your current product catalogue. Integrate a payment provider
          (e.g. Stripe) to capture and display live orders here.
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={ShoppingBag} label="Catalogue items" value={shopProducts.length} detail="Products currently visible inside the shop management surface." tone="sage" />
          <StatCard icon={Tag} label="Average ticket" value={`$${averagePrice.toFixed(0)}`} detail="A simple static proxy until live order and cart data are connected." tone="amber" />
          <StatCard icon={Package} label="Commerce readiness" value="Partial" detail="Product presentation is ready; transactional reporting still needs persistence." tone="sky" />
        </div>

        <Panel title="Product catalogue" eyebrow="Shop management">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shopProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-[26px] border border-beige bg-cream p-5"
              >
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="h-36 w-full rounded-2xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-medium leading-snug text-charcoal">{product.title}</p>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sage-dark">
                    ${product.price}
                  </span>
                </div>
                <p className="text-sm leading-6 text-warm-gray line-clamp-3">{product.description}</p>
                <span className="self-start rounded-full border border-beige bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-warm-gray">
                  {product.type}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="When orders go live" eyebrow="Suggested structure">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-beige bg-cream p-5">
              <p className="text-sm font-medium text-charcoal">Daily order board</p>
              <p className="mt-2 text-sm leading-6 text-warm-gray">Track purchases, fulfillment status, and refunds in one place.</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-cream p-5">
              <p className="text-sm font-medium text-charcoal">Inventory and offer pacing</p>
              <p className="mt-2 text-sm leading-6 text-warm-gray">Compare product interest, bundles, and average order value over time.</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-cream p-5">
              <p className="text-sm font-medium text-charcoal">Finance handoff</p>
              <p className="mt-2 text-sm leading-6 text-warm-gray">Surface payout data and exceptions cleanly for bookkeeping review.</p>
            </div>
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
