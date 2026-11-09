// POS subscribers: every store using Naqdi X, with its package and end date.
// Filled automatically from paid orders, and added or edited by hand in the admin panel.
export async function up(knex) {
  await knex.schema.createTable('pos_subscribers', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('store', 160);
    t.string('phone', 40);
    t.string('email', 190);
    t.integer('product_id').unsigned().nullable();
    t.string('package', 120).notNullable();
    t.bigInteger('start_date').notNullable();
    t.bigInteger('end_date').nullable(); // null = no end (lifetime, e.g. the Android app)
    t.decimal('amount', 12, 3).nullable();
    t.string('currency', 3).notNullable().defaultTo('KWD');
    t.integer('order_id').unsigned().nullable();
    t.string('serial', 40);
    t.boolean('suspended').notNullable().defaultTo(false);
    t.text('notes');
    t.bigInteger('created_at').notNullable();
    t.bigInteger('updated_at').notNullable();
    t.index(['email']);
    t.index(['end_date']);
  });

  // bring in everyone who already paid
  const paid = await knex('orders').where({ status: 'paid' }).orderBy('id');
  for (const o of paid) {
    const lic = o.kind === 'app' ? await knex('licenses').where({ order_id: o.id }).first() : null;
    const t = Date.now();
    const existing = o.kind === 'plan' && o.email
      ? await knex('pos_subscribers').where({ email: o.email, product_id: o.product_id }).whereNotNull('end_date').first() : null;
    if (existing) {
      await knex('pos_subscribers').where({ id: existing.id }).update({ end_date: o.period_end, order_id: o.id, amount: o.amount, updated_at: t });
      continue;
    }
    await knex('pos_subscribers').insert({
      name: o.customer_name, store: o.company, phone: o.phone, email: o.email, product_id: o.product_id, package: o.product_name,
      start_date: o.period_start || o.paid_at || o.created_at, end_date: o.kind === 'plan' ? o.period_end : null,
      amount: o.amount, currency: o.currency || 'KWD', order_id: o.id, serial: lic?.serial || null, suspended: false, created_at: t, updated_at: t,
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pos_subscribers');
}
