FROM node:18-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# Builduje frontend do katalogu /app/dist
RUN npm run build

EXPOSE 3000

# Uruchamiamy backend, który serwuje też frontend
CMD [ "node", "server/index.js" ]
