-   config:

2 files are needed, config.env in root, and .env in /client, there's a sample for each

-   local dev:

run client locally from /client:

npm run dev

run db server locally from /server:

node --env-file=config.env server

-   prod:

express backend is hosted on render at https://pub-map.onrender.com/ (note no port 5050)
react frontend is hosted on vercel at https://pubsofcambridge.vercel.app/

-   misc:

counts calls to mapbox to avoid exceeding the limit. currently not doing this monthly, so must be reset in mongodb to the current month's calls (from mapbox dashboard) if we exceed the limit

an uptime robot http monitor sends a request to the render server every 10 mins to stop it spinning down https://dashboard.uptimerobot.com/monitors/797982851
