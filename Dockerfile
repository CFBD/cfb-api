FROM node:10-alpine

RUN mkdir -p /home/node/cfb-api/node_modules && chown -R node:node /home/node/cfb-api

WORKDIR /home/node/cfb-api

COPY package*.json ./

RUN npm install pm2 -g
RUN npm install

COPY . .
COPY --chown=node:node . .

USER node

EXPOSE 8080

CMD [ "pm2-runtime", "server.js" ]
