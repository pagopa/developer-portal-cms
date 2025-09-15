'use strict';

module.exports = {
  async up(knex) {
    const tableExists = await knex.schema.hasTable('tutorials_components');

    // If tutorials_components table does not exist,
    // print a warning and skip the migration.
    if (!tableExists) {
      console.log("'tutorials_components' table does not exist. Skipping migration.");
      return;
    }
    // Select all components of type 'parts.ck-editor'
    // linked to tutorials from the linking table (tutorials_components).
    const oldComponents = await knex('tutorials_components')
      .where('component_type', 'parts.ck-editor');

    console.log(`Found ${oldComponents.length} components 'parts.ck-editor' to migrate.`);

    // Iterate over each found component
    for (const link of oldComponents) {
      // Old component ID and tutorial ID
      const oldComponentId = link.component_id;
      const tutorialId = link.entity_id;

      // Get the content of the old component from 'components_parts_ck_editors' table.
      const oldComponentContent = await knex('components_parts_ck_editors')
        .where('id', oldComponentId)
        .first();

      // Continue if the old component content is not found
      if (!oldComponentContent) {
        console.warn(`Content not found for components_parts_ck_editors ${oldComponentId}. Skipping...`);
        continue;
      }

      //Create a new entry in 'components_parts_ck_editor_htmls' table
      // with the content copied from the old component.
      // `returning('id')` gives us the ID of the newly created row.
      const [newComponent] = await knex('components_parts_ck_editor_htmls')
        .insert({
          content: oldComponentContent.content,
        })
        .returning('id');

      const newComponentId = newComponent.id;


      // Update the linking table to point to the new component.
      // Change the component_type to 'parts.ck-editor-html'
      await knex('tutorials_components')
        .where({ id: link.id })
        .update({
          component_type: 'parts.ck-editor-html',
          component_id: newComponentId,
        });

      // Delete the old component from 'components_parts_ck_editors' table.
      await knex('components_parts_ck_editors').where('id', oldComponentId).del();

      console.log(`Migrated component for tutorial with ID: ${tutorialId}. New component ID:  ${newComponentId}`);
    }

    console.log("Migration completed.");
  },
};
