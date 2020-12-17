import "../styles/styles.scss";

import Vue from "vue";
import BattleComponent from "components/battle.vue";
import { Battle } from "common/model/battle";
import config from "../../../config.json";

declare var __IS_DEV__: boolean;

if (__IS_DEV__) {
    document.body.classList.add("dev");
}

const vue = new Vue({
    el: "#vue",
    template: `
    <div class="battles">
        <battle-component v-for="battle in battles" :battle="battle" v-bind:key="battle.battleId" />
    </div>
    `,
    data: {
        battles: [] as Battle[]
    },
    components: {
        BattleComponent
    },
    created() {
        const s = location.protocol === "https:" ? "s" : "";
        const ws = new WebSocket(`ws${s}://localhost:${config.port}`);

        ws.onopen = event => console.log("Connected to WS");
        ws.onmessage = event => {
            const battles = JSON.parse(event.data);
            this.battles = battles;
        };
    }
});