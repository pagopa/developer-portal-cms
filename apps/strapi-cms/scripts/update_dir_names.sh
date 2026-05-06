#!/bin/bash

# Rebuild dir_name values for content already stored in the database.
#
# This script runs a single transaction that:
# - updates guide version directories to <product>/<guide>/<version>
# - updates solution directories to solutions/<slug>
# - updates release note directories to <product>/release_notes

echo "Running database updates..."
# Execute all directory name rewrites atomically against the local Postgres instance.
psql -U postgres -d postgres <<EOF
BEGIN;

-- Update dir_name of guides
WITH new_paths AS (
    SELECT 
        c.id AS cmp_id,
        p.slug || '/' || g.slug || '/' || c.version AS generated_path
    FROM components_common_guide_versions c
    JOIN guides_cmps gc ON c.id = gc.cmp_id AND gc.field = 'versions'
    JOIN guides g ON gc.entity_id = g.id
    JOIN guides_product_lnk gpl ON g.id = gpl.guide_id
    JOIN products p ON gpl.product_id = p.id
    WHERE p.slug IS NOT NULL AND p.slug <> ''
      AND g.slug IS NOT NULL AND g.slug <> ''
      AND c.version IS NOT NULL AND c.version <> ''
)
UPDATE components_common_guide_versions
SET dir_name = new_paths.generated_path
FROM new_paths
WHERE components_common_guide_versions.id = new_paths.cmp_id;

-- Update dir_name of solutions
UPDATE solutions
SET dir_name = 'solutions/' || slug;

-- Update dir_name of release notes
WITH new_dir_names AS (
    SELECT
        rn.id AS rn_id,
    	p.slug || '/release_notes' AS generated_dir_name
    FROM release_notes rn
    JOIN products_release_note_lnk prnl ON prnl.release_note_id = rn.id
    JOIN products p ON prnl.product_id = p.id
)
UPDATE release_notes rn
SET dir_name = new_dir_names.generated_dir_name
FROM new_dir_names
WHERE rn.id = new_dir_names.rn_id;

COMMIT;
EOF

echo "Updates completed successfully!"
