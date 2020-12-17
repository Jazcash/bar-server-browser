import webpackConfig from "../../webpack.config";
import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";
import WebSocket from "ws";
import https from "https";
import fs from "fs";

export interface ServerConfig {
    isDev: boolean;
    port: number;
    sslKeyLocation: string;
    sslCertLocation: string;
}

export class Server {
    public app: express.Application;
    public server: https.Server;
    public serverWs: https.Server;
    public wss: WebSocket.Server;
    
    protected config: ServerConfig;

    constructor(config: ServerConfig) {
        this.config = config;

        const key = fs.readFileSync(this.config.sslKeyLocation);
        const cert = fs.readFileSync(this.config.sslCertLocation);
        
        this.app = express();
        this.server = https.createServer({ key, cert }, this.app);
        this.serverWs = https.createServer({ key, cert });
        this.wss = new WebSocket.Server({
            server: this.serverWs
        });

        this.app.set("view engine", "ejs");
        this.app.set("views", "dist/client");

        this.app.use(express.static("dist/client"));

        if (this.config.isDev){
            const clientConfig = webpackConfig("dev")[0];
            clientConfig.stats = "minimal";
            const compiler = webpack(clientConfig);
            this.app.use(webpackDevMiddleware(compiler, {
                publicPath: clientConfig.output?.publicPath
            }));
            this.app.use(webpackHotMiddleware(compiler, { log: false }));
        }

        this.app.get("/", async (req, res) => {
            res.render("index");
        });
    }

    public async start() {
        return new Promise<void>(resolve => {
            this.server.listen(this.config.port, () => {
                console.log(`Server running at https://localhost:${this.config.port}`);
                this.serverWs.listen(this.config.port + 1, () => {
                    console.log(`WebSocket server running at https://localhost:${this.config.port + 1}`);
                    resolve();
                });
            });
        });
    }
}