// Plans are yearly only: Single Branch 65 KWD, Multi Branch 109 KWD. Android app: one payment of 145 KWD.
const f = (en, ar) => JSON.stringify({ en, ar });

export async function up(knex) {
  await knex('products').where({ slug: 'starter' }).update({
    slug: 'single-branch', name: 'Single Branch', name_ar: 'فرع واحد', sort: 1, highlighted: false, is_active: true,
    tagline: 'Everything one store needs', tagline_ar: 'كل ما يحتاجه متجر واحد',
    price_monthly: null, price_yearly: 65,
    features: f(
      ['One branch', 'Unlimited sales, returns and receipts', 'Barcode scanning', 'Inventory and low-stock alerts', 'Customers and loyalty points', 'Promotions and discounts', 'Staff accounts and permissions', 'Daily sales and profit reports', 'Arabic and English receipts'],
      ['فرع واحد', 'مبيعات ومرتجعات وإيصالات بلا حدود', 'قراءة الباركود', 'المخزون وتنبيهات النقص', 'العملاء ونقاط الولاء', 'العروض والخصومات', 'حسابات الموظفين والصلاحيات', 'تقارير المبيعات والأرباح اليومية', 'إيصالات بالعربية والإنجليزية'],
    ),
  });
  await knex('products').where({ slug: 'enterprise' }).update({
    slug: 'multi-branch', name: 'Multi Branch', name_ar: 'فروع متعددة', sort: 2, highlighted: true, is_active: true,
    tagline: 'For chains and growing businesses', tagline_ar: 'للسلاسل والأعمال النامية',
    price_monthly: null, price_yearly: 109,
    features: f(
      ['Everything in Single Branch', 'Multiple branches, one dashboard', 'Stock transfers between branches', 'Central price and product control', 'Reports per branch and combined', 'API and accounting / ERP integration', 'Priority support'],
      ['كل مزايا باقة الفرع الواحد', 'فروع متعددة بلوحة تحكم واحدة', 'تحويل المخزون بين الفروع', 'تحكم مركزي بالأسعار والمنتجات', 'تقارير لكل فرع وتقرير موحّد', 'ربط API وأنظمة المحاسبة', 'دعم بأولوية'],
    ),
  });
  await knex('products').where({ slug: 'business' }).update({ is_active: false, price_monthly: null, sort: 9 });
  await knex('products').where({ slug: 'android-pos' }).update({ price_once: 145 });
}

export async function down() { /* prices are managed in the admin panel */ }
