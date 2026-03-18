ARG NODE_IMAGE=node:22.21.1-alpine3.21@sha256:af8023ec879993821f6d5b21382ed915622a1b0f1cc03dbeb6804afaf01f8885

# Creating multi-stage build for production
FROM ${NODE_IMAGE} AS build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev > /dev/null 2>&1

WORKDIR /opt/
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
RUN npm dedupe
ENV PATH=/opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY . .
RUN rm -rf .cache .strapi dist build node_modules
ENV NODE_ENV=production
RUN npm run build

RUN npm prune --omit=dev

# Creating final production image
FROM ${NODE_IMAGE} AS buildfinal
RUN apk add --no-cache vips-dev
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY --chown=node:node --from=build /opt/node_modules ./node_modules
WORKDIR /opt/app
COPY --chown=node:node --from=build /opt/app ./
ENV PATH=/opt/node_modules/.bin:$PATH

USER node
EXPOSE 1337
CMD ["npm", "run", "start"]
