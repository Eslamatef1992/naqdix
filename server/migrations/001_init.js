// Naqdi X: products (POS plans + Android app), orders paid through PayPal, serial codes, demo requests.
export async function up(knex) {
  await knex.schema.createTable('admins', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 120).notNullable();
    t.bigInteger('created_at').notNullable();
  });

  await knex.schema.createTable('products', (t) => {
    t.increments('id');
    t.string('kind', 16).notNullable(); // plan | app
    t.string('slug', 60).notNullable().unique();
    t.string('name', 120).notNullable();
    t.string('name_ar', 120);
    t.string('tagline', 255);
    t.string('tagline_ar', 255);
    t.decimal('price_monthly', 12, 3); // plans
    t.decimal('price_yearly', 12, 3); // plans
    t.decimal('price_once', 12, 3); // app: one full payment
    t.string('currency', 3).notNullable().defaultTo('KWD');
    t.text('features'); // { en: [...], ar: [...] }
    t.boolean('highlighted').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort').notNullable().defaultTo(0);
    t.bigInteger('created_at').notNullable();
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id');
    t.string('number', 32).notNullable().unique(); // NQX-2026-00001
    t.string('token', 64).notNullable().unique(); // the customer's private order link
    t.integer('product_id').unsigned().notNullable().references('products.id');
    t.string('kind', 16).notNullable(); // plan | app
    t.string('interval', 16).notNullable(); // monthly | yearly | once
    t.string('product_name', 120).notNullable();
    t.string('customer_name', 120).notNullable();
    t.string('company', 160);
    t.string('email', 190).notNullable();
    t.string('phone', 40).notNullable();
    t.string('lang', 2).notNullable().defaultTo('en');
    t.decimal('amount', 12, 3).notNullable();
    t.string('currency', 3).notNullable();
    t.string('status', 16).notNullable().defaultTo('pending'); // pending | paid | canceled
    t.string('provider', 16); // paypal | manual
    t.string('provider_ref', 64); // PayPal order id
    t.string('payment_ref', 64); // PayPal capture id / receipt no.
    t.integer('renews_order_id').unsigned();
    t.bigInteger('period_start');
    t.bigInteger('period_end');
    t.text('notes');
    t.bigInteger('paid_at');
    t.bigInteger('created_at').notNullable();
    t.index(['status', 'id']);
    t.index(['email']);
    t.index(['provider', 'provider_ref']);
  });

  await knex.schema.createTable('licenses', (t) => {
    t.increments('id');
    t.string('serial', 32).notNullable().unique();
    t.integer('order_id').unsigned().references('orders.id').onDelete('SET NULL');
    t.integer('product_id').unsigned().references('products.id');
    t.string('customer_name', 120);
    t.string('email', 190);
    t.string('phone', 40);
    t.string('status', 16).notNullable().defaultTo('issued'); // issued | activated | revoked
    t.string('device', 190); // device / build notes from the admin
    t.text('notes');
    t.bigInteger('activated_at');
    t.bigInteger('created_at').notNullable();
  });

  await knex.schema.createTable('leads', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('company', 160);
    t.string('email', 190);
    t.string('phone', 40).notNullable();
    t.string('interest', 60);
    t.text('message');
    t.string('status', 16).notNullable().defaultTo('new'); // new | contacted | closed
    t.bigInteger('created_at').notNullable();
  });

  await knex.schema.createTable('settings', (t) => {
    t.string('key', 60).primary();
    t.text('value');
  });

  const created_at = Date.now();
  const f = (en, ar) => JSON.stringify({ en, ar });
  const rows = [
    {
      kind: 'plan', slug: 'starter', name: 'Starter', name_ar: 'المبتدئ', sort: 1, created_at,
      tagline: 'One shop, one counter', tagline_ar: 'متجر واحد ونقطة بيع واحدة',
      price_monthly: 9, price_yearly: 90, currency: 'KWD',
      features: f(
        ['1 register', 'Sales, returns and receipts', 'Barcode scanning', 'Inventory and low-stock alerts', 'Daily sales reports', 'Arabic and English receipts'],
        ['نقطة بيع واحدة', 'المبيعات والمرتجعات والإيصالات', 'قراءة الباركود', 'المخزون وتنبيهات النقص', 'تقارير المبيعات اليومية', 'إيصالات بالعربية والإنجليزية'],
      ),
    },
    {
      kind: 'plan', slug: 'business', name: 'Business', name_ar: 'الأعمال', sort: 2, highlighted: true, created_at,
      tagline: 'Growing stores with a team', tagline_ar: 'للمتاجر النامية مع فريق عمل',
      price_monthly: 19, price_yearly: 190, currency: 'KWD',
      features: f(
        ['Up to 3 registers', 'Staff accounts and permissions', 'Customers and loyalty points', 'Promotions and discounts', 'Purchase orders and suppliers', 'KNET and card payment terminals'],
        ['حتى 3 نقاط بيع', 'حسابات الموظفين والصلاحيات', 'العملاء ونقاط الولاء', 'العروض والخصومات', 'أوامر الشراء والموردين', 'أجهزة الدفع بالكي نت والبطاقات'],
      ),
    },
    {
      kind: 'plan', slug: 'enterprise', name: 'Multi-branch', name_ar: 'متعدد الفروع', sort: 3, created_at,
      tagline: 'Chains and multiple branches', tagline_ar: 'للسلاسل والفروع المتعددة',
      price_monthly: 39, price_yearly: 390, currency: 'KWD',
      features: f(
        ['Unlimited registers', 'Multiple branches, one dashboard', 'Stock transfers between branches', 'Central price and product control', 'API and accounting / ERP integration', 'Priority support'],
        ['نقاط بيع غير محدودة', 'فروع متعددة بلوحة تحكم واحدة', 'تحويل المخزون بين الفروع', 'تحكم مركزي بالأسعار والمنتجات', 'ربط API وأنظمة المحاسبة', 'دعم بأولوية'],
      ),
    },
    {
      kind: 'app', slug: 'android-pos', name: 'Naqdi X POS for Android', name_ar: 'تطبيق نقدي إكس لنقاط البيع على أندرويد', sort: 10, created_at,
      tagline: 'Pay once, own the app', tagline_ar: 'ادفع مرة واحدة وامتلك التطبيق',
      price_once: 120, currency: 'KWD',
      features: f(
        ['Works offline, syncs when online', 'Android handheld POS with built-in printer', 'Camera and Bluetooth barcode scanning', 'Arabic and English receipts', 'Inventory, customers and daily Z-report', 'Cash, KNET and card payments', 'Your logo and store details on receipts', 'Activation with your personal serial code'],
        ['يعمل دون إنترنت ويتزامن عند الاتصال', 'أجهزة أندرويد المحمولة مع طابعة مدمجة', 'قراءة الباركود بالكاميرا أو البلوتوث', 'إيصالات بالعربية والإنجليزية', 'المخزون والعملاء وتقرير الإغلاق اليومي', 'الدفع نقداً أو بالكي نت أو بالبطاقة', 'شعارك وبيانات متجرك على الإيصال', 'التفعيل برمز تسلسلي خاص بك'],
      ),
    },
  ];
  for (const row of rows) await knex('products').insert({ highlighted: false, price_monthly: null, price_yearly: null, price_once: null, ...row });

  await knex('settings').insert([
    { key: 'whatsapp', value: '' }, // e.g. 96550000000 (digits only)
    { key: 'email', value: '' },
    { key: 'address', value: 'Kuwait' },
  ]);
}

export async function down(knex) {
  for (const t of ['settings', 'leads', 'licenses', 'orders', 'products', 'admins']) await knex.schema.dropTableIfExists(t);
}
