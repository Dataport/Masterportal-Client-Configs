FROM node:20.15.0-bullseye-slim AS masterportal-build
ARG VERSION

RUN apt update && apt install -y git
RUN git clone https://bitbucket.org/geowerkstatt-hamburg/masterportal.git --branch $VERSION --single-branch
WORKDIR /masterportal
RUN npm ci
ENV NODE_ENVIRONMENT production
RUN npm run buildPortal

FROM node:20.15.0-bullseye-slim AS masterportal-clientconfigs-production-environment
RUN apt update && apt install -y python3
WORKDIR /masterportal-clientconfigs
COPY package.json package-lock.json ./
ENV NODE_ENVIRONMENT production
RUN npm ci

FROM node:20.15.0-bullseye-slim
WORKDIR /masterportal-clientconfigs
COPY package.json package-lock.json ./
COPY --from=masterportal-clientconfigs-production-environment /masterportal-clientconfigs/node_modules node_modules
COPY --from=masterportal-build /masterportal/dist/mastercode /masterportal-clientconfigs/dist/mastercode
COPY app app

ENV NODE_ENVIRONMENT production
EXPOSE 80/tcp
CMD npm run prod