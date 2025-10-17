'use strict';

async function up(knex) {
  const tableExists = await knex.schema.hasTable('products');
  if (!tableExists) {
    console.warn('Table "products" does not exist. Skipping migration.');
    return;
  }

  const hasColumn = await knex.schema.hasColumn('products', 'is_visible');
  if (!hasColumn) {
    await knex.schema.table('products', (table) => {
      table.boolean('is_visible').defaultTo(false);
    });
  }

  // Set true for all existing rows that are null or false.
  await knex('products')
    .where(builder => builder.whereNull('is_visible').orWhere('is_visible', false))
    .update({ is_visible: true });
}

module.exports = { up };
