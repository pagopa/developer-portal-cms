'use strict';

module.exports = {
  async up(knex) {
    const tableExists = await knex.schema.hasTable('tutorials_components');

    if (!tableExists) {
      console.log("'tutorials_components' table does not exist. Skipping migration.");
      return;
    }

    const oldComponents = await knex('tutorials_components')
      .where('component_type', 'parts.ck-editor');

    console.log(`Found ${oldComponents.length} components 'parts.ck-editor' to migrate.`);

    // La creazione della tabella è fatta una sola volta, quindi può rimanere qui.
    // Nota: lo script originale mischiava `knex` e `strapi.db.connection`.
    // Per coerenza, usiamo `knex` anche qui.
    const hasHtmlTable = await knex.schema.hasTable('components_parts_ck_editor_htmls');
    if (!hasHtmlTable) {
      await knex.schema.createTable('components_parts_ck_editor_htmls', (table) => {
        table.increments('id').primary();
        table.text('content', 'longtext');
      });
      console.log("Created table 'components_parts_ck_editor_htmls'.");
    }

    // Itera su ogni componente trovato
    for (const component of oldComponents) {
      // Usa una transazione per ogni componente per garantire l'integrità e usare una sola connessione
      await knex.transaction(async (trx) => {
        const oldComponentId = component.component_id;
        const tutorialId = component.entity_id;

        // 1. Ottieni il contenuto del vecchio componente
        const oldComponentContent = await trx('components_parts_ck_editors')
          .where('id', oldComponentId)
          .first();

        if (!oldComponentContent) {
          console.warn(`Content not found for components_parts_ck_editors ${oldComponentId}. Skipping...`);
          // Uscendo dalla funzione della transazione qui, non verrà eseguito il commit
          return;
        }

        // 2. Crea una nuova entry nella tabella HTML
        const [newComponent] = await trx('components_parts_ck_editor_htmls')
          .insert({
            content: oldComponentContent.content,
          })
          .returning('id');

        const newComponentId = newComponent.id || newComponent; // Adattamento per SQLite e PostgreSQL

        // 3. Aggiorna la tabella di collegamento per puntare al nuovo componente
        await trx('tutorials_components')
          .where({ id: component.id })
          .update({
            component_type: 'parts.ck-editor-html',
            component_id: newComponentId,
          });

        // 4. Elimina il vecchio componente
        await trx('components_parts_ck_editors').where('id', oldComponentId).del();

        console.log(`Migrated component for tutorial ID: ${tutorialId}. New component ID: ${newComponentId}`);
      }); // La transazione esegue il COMMIT automaticamente qui se non ci sono stati errori
    }

    console.log("Migration completed successfully.");
  },
};
