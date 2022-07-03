import { Player } from "./Player.js";

class UI{
    constructor(options){
        this.player = null;
        this.game = options.game;
        document.getElementById("continue-game").onclick = () => this.continueGame();
        "change mousewheel keyup keydown".split(" ").forEach( (e) => {
            document.getElementById("sensitivity").addEventListener(e, (event) => {
                this.changeSensitivity(event.target.value);
            })
        });
        "change mousewheel keyup keydown".split(" ").forEach( (e) => {
            document.getElementById("volume").addEventListener(e, (event) => {
                this.changeVolume(event.target.value);
            })
        });
        "change mousewheel keyup keydown".split(" ").forEach( (e) => {
            document.getElementById("player-shot").addEventListener(e, (event) => {
                this.changePlayerShotCooldown(event.target.value);
            })
        });
        "change mousewheel keyup keydown".split(" ").forEach( (e) => {
            document.getElementById("npc-shot").addEventListener(e, (event) => {
                this.changeNPCShotCooldown(event.target.value);
            })
        });
    }
   
    changeSensitivity(value){
        this.player.sensitivity = value / 10000;
    }

    changeVolume(value){
        const newVolume = value / 100
        this.game.sfx?.changeVolume(newVolume);
        this.game.players.forEach(player => player.sfx?.changeVolume(newVolume));
    }

    changePlayerShotCooldown(value){
        this.player.SHOOTING_COOLDOWN = parseInt(value);
    }

    changeNPCShotCooldown(value){
        this.game.players.forEach(player =>{
            if(player.object)
                player.SHOOTING_COOLDOWN = parseInt(value);
        })
    }

    continueGame(){
        this.game.isPaused = false;
        this.hideMenu();
    }

    setPlayer(player) {
        this.player = player;
    }

    loadingCompleted(){
        document.getElementById("loading").style.display = "none";
        document.getElementById("crosshair").style.display = "block";
        this.updateHealth();
        document.getElementById("health").style.display = "block";
        this.updateEliminations();
        document.getElementById("eliminations").style.display = "block";
        this.showMenu();
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

    updateScoreboard(){
        document.getElementById("scoreboard-body").innerHTML = "";
        const players = [];

        this.game.players.forEach(player => players.push({name: player.name, kills: player.kills, deaths: player.deaths}));
        players.sort( (a, b) => {
            if(a.kills > b.kills)
                return -1;
            if(a.kills < b.kills)
                return 1;
            return a.deaths <= b.deaths ? -1 : 1;
        });
        for(let i = 0; i < players.length; i++){
            this.createScoreboardEntry(players[i], i + 1);
        }
    }

    createScoreboardEntry(player, position){
        const entry = document.createElement("tr");
        const pos = document.createElement("th");
        pos.innerHTML = position;
        const name = document.createElement("td");
        name.innerHTML = player.name;
        const kills = document.createElement("td");
        kills.innerHTML = player.kills;
        const deaths = document.createElement("td");
        deaths.innerHTML = player.deaths;
        entry.appendChild(pos);
        entry.appendChild(name);
        entry.appendChild(kills);
        entry.appendChild(deaths);
        document.getElementById("scoreboard-body").appendChild(entry);
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

    showMenu(){
        
        this.updateScoreboard();
        document.getElementById("menu").style.display = "block";
        document.getElementById("information").style.display = "block";
        document.exitPointerLock();
        if(this.game.sfx)
		    this.game.sfx.pause("ambience");
        else{
            this.game.loadSounds();
            this.changeVolume(50);
        }
    }

    hideMenu(){
        document.getElementById("menu").style.display = "none";
        document.getElementById("information").style.display = "none";
        this.player?.element?.requestPointerLock();
        if(this.game.sfx)
		    this.game.sfx.play("ambience");
    }
}

export { UI };
