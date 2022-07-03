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
        document.getElementById("health").style.display = "block";
        this.updateHealth();
        document.getElementById("eliminations").style.display = "block";
        this.updateEliminations();
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

    updateHealth(){
        document.getElementById("health-value").innerHTML = this.player?.currentHealth;
    }

    updateEliminations(){
        document.getElementById("eliminations-value").innerHTML = this.player?.kills;
    }

    updateDeathTimer(){
        document.getElementById("death-timer").innerHTML = ((this.player.nextRespawn - Date.now()) / 1000).toFixed(2);
    }

    showDeathTimer(){
        document.getElementById("death").style.display = "block";
    }

    hideDeathTimer(){
        document.getElementById("death").style.display = "none";
    }
}

export { UI };
