- config:

2 files are needed, config.env in root, and .env in /client, there's a sample for each

- local dev:

run client locally from /client:

npm run dev

run db server locally from root:

node --env-file=config.env server
