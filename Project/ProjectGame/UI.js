import { Player } from "./Player.js";

class UI{
    constructor(options){
        this.player = null;
        this.game = options.game;
        console.log(options);
    }

   
    setPlayer(player) {
        this.player = player;
    }

    loadingCompleted(){
        document.getElementById("loading").style.display = "none";
        document.getElementById("crosshair").style.display = "block";
    }

    loadingUpdate(){
        if(this.environmentReady){
            document.getElementById("loading-environment").innerHTML = "Environment Loaded";
            document.getElementById("loading-environment-spinner").style.display = "none";
        }
        if(this.playerReady){
            document.getElementById("loading-player").innerHTML = "Player Loaded";
            document.getElementById("loading-player-spinner").style.display = "none";
        }
        if(this.npcsReady){
            document.getElementById("loading-npc").innerHTML = "NPCs Loaded";
            document.getElementById("loading-npc-spinner").style.display = "none";
        }
    }
}

export { UI };
