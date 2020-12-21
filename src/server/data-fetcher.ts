import { Battle } from "common/model/battle";
import { Player } from "common/model/player";
import { SpringLobbyProtocolClient } from "sluts";

export interface DataFetcherConfig {
    slp_host: string;
    slp_port: number;
    username: string;
    password: string;
}

const defaultDataFetcherConfig: Partial<DataFetcherConfig> = {
};

export class DataFetcher {
    protected config: DataFetcherConfig;
    protected slpClient: SpringLobbyProtocolClient;
    protected battles: { [key: number]: Battle<{ [username: string]: Player }> } = {};
    protected players: { [key: string]: Player } = {};

    constructor(config: DataFetcherConfig) {
        this.config = Object.assign({}, defaultDataFetcherConfig, config);
        this.slpClient = new SpringLobbyProtocolClient({ verbose: true });
    }

    public async listen() {
        await this.slpClient.connect(this.config.slp_host, this.config.slp_port);

        this.slpClient.onResponse("ADDUSER").add(data => {
            this.players[data.userName] = {
                username: data.userName,
                userId: data.userId,
                country: data.country
            };
        });

        this.slpClient.onResponse("REMOVEUSER").add(data => {
            const player = this.players[data.userName];
            if (player.battleId){
                delete this.battles[player.battleId].players[player.username];
            }
            delete this.players[data.userName];
        });

        this.slpClient.onResponse("CLIENTSTATUS").add(data => {
            const player = this.players[data.userName];
            player.status = data.status;
        });

        this.slpClient.onResponse("BATTLEOPENED").add(data => {
            this.battles[data.battleId] = {
                battleId: data.battleId,
                founder: this.players[data.founder],
                game: data.gameName,
                ip: data.ip,
                port: data.port,
                locked: false,
                map: data.map,
                mapHash: data.mapHash,
                maxPlayers: data.maxPlayers,
                passworded: data.passworded,
                rank: data.rank,
                title: data.title,
                players: {},
                spectators: 0
            };

            const founder = this.players[data.founder];
            if (founder && founder.status && !founder.status.bot) {
                this.battles[data.battleId].players[founder.username] = founder;
            }
        });

        this.slpClient.onResponse("BATTLECLOSED").add(data => {
            delete this.battles[data.battleId];
        });

        this.slpClient.onResponse("UPDATEBATTLEINFO").add(data => {
            const battle = this.battles[data.battleId]
            battle.locked = data.locked;
            battle.spectators = data.spectatorCount;
            battle.mapHash = data.mapHash;
            battle.map = data.mapName;
        });

        this.slpClient.onResponse("JOINEDBATTLE").add(data => {
            const player = this.players[data.userName];
            const battle = this.battles[data.battleId];

            battle.players[player.username] = player;
        });

        this.slpClient.onResponse("LEFTBATTLE").add(data => {
            const player = this.players[data.userName];
            const battle = this.battles[data.battleId];

            delete battle.players[player.username];
        });

        const loginResponse = await this.slpClient.login(this.config.username, this.config.password);
        if (!loginResponse.success) {
            console.log(loginResponse.error);
            return;
        }
    }

    public getActiveBattles() : Battle[] {
        const allBattles: Battle[] = Object.values(this.battles).map(battle => {
            const playersObj = battle.players;
            const playersArr = Object.values(playersObj);
            return {
                ...battle,
                players: playersArr
            };
        });
        const activeBattles = allBattles.filter(battle => battle.players.length > 0);
        return activeBattles;
    }
}