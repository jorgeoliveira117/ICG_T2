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
}

export { UI };
