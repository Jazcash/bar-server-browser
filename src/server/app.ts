import { DataFetcher } from "data-fetcher";
import { Server } from "server";
import config from "../../config.json";

declare const __IS_DEV__: boolean;

(async () => {
    const dataFetcher = new DataFetcher(config);
    const server = new Server({ isDev: __IS_DEV__, port: config.port, sslKeyLocation: config.ssl_key, sslCertLocation: config.ssl_cert });

    await dataFetcher.listen();

    server.app.ws("/", async (ws, req) => {
        ws.send(JSON.stringify(dataFetcher.getActiveBattles()));
    });

    const clients = server.wss.getWss().clients;
    setInterval(() => {
        const battlesStr = JSON.stringify(dataFetcher.getActiveBattles());
        clients.forEach(client => {
            client.send(battlesStr);
        });
    }, 5000);

    await server.start();
})();