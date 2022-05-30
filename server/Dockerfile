# Build image inlcuding secrets
FROM node:18-alpine AS base

WORKDIR /kchap                           
COPY ./kchap .
EXPOSE 3000

# Build image copies all src content, while production only copies the build output
# Avoid production environment variables or flags since build requires @types/node (dev 
# dependency). To run the app it is required to have the dist and node_modules folders. 
# The later can be minimized by redownloading the dependencies using the production flag.
FROM base as build-production
RUN npm i -g @nestjs/cli copyfiles typescript && \
    yarn install && \
    nest build
#RUN rm -rf node_modules && yarn install --production --frozen-lockfile

FROM base as dev
ENV NODE_ENV=development
RUN npm i -g @nestjs/cli && \
    yarn install
COPY . /
CMD ["npm", "run", "start:dev"]

FROM node:18.1.0-alpine3.15@sha256:b9ca87caa97ead538acfe15fed80635e2becb67350b8911ea02f28bc299fda39 as production
ENV NODE_ENV production
RUN apk add --no-cache tini
USER node
WORKDIR /usr/app
COPY --from=build-production /kchap/dist ./dist
COPY --from=build-production /kchap/node_modules ./node_modules
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/http/src/main.js"]