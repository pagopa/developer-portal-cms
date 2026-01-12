# Developer Portal CMS

In this repository you can find anything you need to work on the developer portal project strapi cms.

## Requirements

- [Node.js](https://nodejs.org/docs/latest-v18.x/api/index.html)
- [npm CLI](https://docs.npmjs.com/cli/v9)

## Local development

(Optional) First time set-up project or when there are changes to strapi collection:
```bash
npm run precompile -w strapi-cms 
npm run compile 
```

Locally run strapi-cms:
```bash
npm run dev -w strapi-cms    
```

### Populate strapi cms


To use SQLite for local development, add the following configuration to the `sqlite` object in `apps/strapi-cms/config/database.ts` to ensure the transfer completes successfully:
```
      pool: {
        min: 2,
        max: 20,
        acquireTimeoutMillis: 300000,
        createTimeoutMillis: 300000,
        destroyTimeoutMillis: 300000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis:1000,
        createRetryIntervalMillis: 2000
      },
      debug: false,
```
**Important**: remember to remove these lines after the transfer, before launching Strapi.

Run the following command to start the trasfer and populate the database:
``` bash
cd apps/strapi-cms
npx strapi transfer --from https://cms.developer.pagopa.it/admin --from-token <strapi_token>
```
The strapi token can be recovered by a mantainer with admin access to the production cms

Make sure to add the following two lines to your local `.env` file before starting strapi-cms:
``` bash
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

### Run Strapi CMS with Docker

#### Run PostgreSQL
``` bash
docker run -it --rm --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:14
```

#### Create a network and connect the postgres container to it
``` bash
docker network create strapi-network  # Only needed if it doesn't exist
docker network connect strapi-network postgres
```

#### Build Strapi container
``` bash
docker build -t strapi-cms apps/strapi-cms
```

#### Create a .env file for the Strapi container using the following values for the PostgreSQL connection
``` bash
...
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_NAME=postgres
DATABASE_PASSWORD=password
DATABASE_PORT=5432
DATABASE_SCHEMA=public
DATABASE_SSL=false
DATABASE_USERNAME=postgres
...
```

#### Run Strapi container in the same network
``` bash
docker run --name strapi-cms --network strapi-network -p 1337:1337 --env-file apps/strapi-cms/.env-docker strapi-cms
```

Open [http://localhost:1337/admin/](http://localhost:1337/admin/) with your browser to see the CMS backoffice.

### Run test locally


## Deploy in dev and production environments
Currently, the deployment happens automatically in the `dev` environment when a push is made to the `main` branch of the repository, while it is done manually in the `production` environment.
The CMS runs in an Amazon ECS container as defined in the `apps/strapi-cms/Dockerfile`.
In the Docker container, the `package.json` and `package-lock.json` files located in the `apps/strapi-cms` folder are copied, npm packages are installed, and the `npm run start` command is executed to start the Strapi server.

### Update the package-lock.json file whenever a dependency changes
Whenever a `dependency` or `devDependency` is added in a PR to the CMS's `package.json`, it is necessary to update the `apps/strapi-cms/package-lock.json` file by running the command
`npm run prune:strapi -w strapi-cms` from the root of the project.

## Changelog
This project utilizes [changesets](https://github.com/changesets/changesets) to generate the changelog. Here's how you can use it:

1. **Adding Changelog Information**: to add entries to the changelog, execute `npx changeset` or `npm run changeset`.  
This will initiate a wizard that guides you through the process.

2. **Defining the Change Type**: the wizard will ask you to specify the type of changes made (major, minor, patch).  
The summary you provide here will be added to the `CHANGELOG.md` file. Follow the [semver](https://semver.org/#summary) specification in order to choose the proper type of change.

3. **Generating the Changelog**: the [Changelog workflow](.github/workflows/changelog.yaml) uses the changeset's action to convert the changes tracked with `npm run changeset` into a `CHANGELOG.md` file.

4. **Creating a Pull Request**: after generating the changelog, the workflow will create a PR with the proposed changes, which include version bumping and updating the `CHANGELOG.md` file.

5. **Updating the PR**: if additional changes are made while the PR is open, the changeset's bot will automatically update the PR based on the changes in the `.changeset` folder.
