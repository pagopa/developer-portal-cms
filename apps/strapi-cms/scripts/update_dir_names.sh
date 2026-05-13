#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

# Rebuild dir_name values for content already stored in the database.
#
# This script runs a single transaction that:
# - updates guide version directories to <product>/<guide>/<version>
# - updates solution directories to solutions/<slug>
# - updates release note directories to <product>/release_notes

usage() {
    echo "Usage: $0 -U <db_user> -d <db_name>" >&2
}

report_psql_failure() {
    local exit_code="$1"

    echo "Database updates failed." >&2
    echo "psql exited with status ${exit_code} while using user '${db_user}' on database '${db_name}'." >&2
    echo "See the PostgreSQL error output above for the failing statement, SQLSTATE, and server context." >&2
    exit "$exit_code"
}

db_user=""
db_name=""

while getopts ":U:d:" opt; do
    case "$opt" in
        U)
            db_user="$OPTARG"
            ;;
        d)
            db_name="$OPTARG"
            ;;
        :) 
            echo "Missing value for -$OPTARG." >&2
            usage
            exit 1
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            exit 1
            ;;
    esac
done

shift $((OPTIND - 1))

if [ "$#" -ne 0 ]; then
    echo "Unexpected positional arguments: $*" >&2
    usage
    exit 1
fi

if [ -z "$db_user" ] || [ -z "$db_name" ]; then
    echo "Both -U and -d are required." >&2
    usage
    exit 1
fi

echo "Running database updates..."
# Execute all directory name rewrites atomically against the local Postgres instance.
if psql -X --set=ON_ERROR_STOP=1 --echo-errors -U "$db_user" -d "$db_name" <<EOF
\set VERBOSITY verbose
\set SHOW_CONTEXT always
BEGIN;

-- Update dir_name of guides
WITH new_paths AS (
    SELECT 
        c.id AS cmp_id,
        c.dir_name AS old_dir_name,
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
SET dir_name = new_paths.generated_path,
    space_id = new_paths.old_dir_name
FROM new_paths
WHERE components_common_guide_versions.id = new_paths.cmp_id;

-- Update dir_name of solutions
UPDATE solutions
SET space_id = dir_name,
    dir_name = 'solutions/' || slug
WHERE slug IS NOT NULL AND slug <> '';

-- Update dir_name of release notes
WITH new_dir_names AS (
    SELECT
        rn.id AS rn_id,
        rn.dir_name AS old_dir_name,
    	p.slug || '/release_notes' AS generated_dir_name
    FROM release_notes rn
    JOIN products_release_note_lnk prnl ON prnl.release_note_id = rn.id
    JOIN products p ON prnl.product_id = p.id
    WHERE p.slug IS NOT NULL AND p.slug <> ''
)
UPDATE release_notes rn
SET dir_name = new_dir_names.generated_dir_name,
    space_id = new_dir_names.old_dir_name
FROM new_dir_names
WHERE rn.id = new_dir_names.rn_id;

COMMIT;
EOF
then
    echo "Updates completed successfully!"
else
    report_psql_failure "$?"
fi
