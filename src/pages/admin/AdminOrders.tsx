import { shopProducts } from '../../data/content';
import AdminLayout from './AdminLayout';

// Orders management: Connect a shop_orders table in Supabase to show real order data.
// Currently displays the product catalogue with a placeholder orders panel.

const AdminOrders = (): JSX.Element => {
  return (
    <AdminLayout title="Shop & Orders">
      <div className="space-y-6">
        {/* Info banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Order history requires a <code className="font-mono">shop_orders</code> table in
          Supabase. This view shows your current product catalogue. Integrate a payment provider
          (e.g. Stripe) to capture and display live orders here.
        </div>

        <h2 className="font-serif text-xl text-charcoal">Product Catalogue</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shopProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-[24px] border border-beige bg-white p-5 shadow-sm flex flex-col gap-3"
            >
              <img
                src={product.thumbnail}
                alt={product.title}
                className="h-32 w-full rounded-2xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-charcoal text-sm leading-snug">{product.title}</p>
                <span className="shrink-0 rounded-full bg-sage/10 px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
                  ${product.price}
                </span>
              </div>
              <p className="text-xs text-warm-gray line-clamp-2">{product.description}</p>
              <span className="self-start rounded-full border border-beige px-2.5 py-0.5 text-xs text-warm-gray capitalize">
                {product.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
