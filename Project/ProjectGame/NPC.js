import * as THREE from '../libs/three.module.js';

const WEAPON_ROTATIONS = {
	"death_badguy": new THREE.Quaternion(-0.476, -0.536, 0.497, 0.488),
	"firing": new THREE.Quaternion(0.396, -0.487, -0.67, -0.396),
	"idle": new THREE.Quaternion(-0.378, 0.371, 0.531, 0.662),
	"run": new THREE.Quaternion(-0.513, 0.375, 0.590, 0.498)
}


const WEAPON_POSITIONS = {
	"death_badguy": new THREE.Vector3(0,0,0),
	"firing": new THREE.Vector3(0.22, 18.586, -4.6812),
	"idle": new THREE.Vector3(4.17, 23.777, 3.63),
	"run": new THREE.Vector3(0, 23.777, 3.63)
}

class NPC{
	
	constructor(options){
		this.name = "NPC-" + options.id; 

		options.game.scene.add(options.object);
		
		this.object = options.object;
		this.hitbox = options.hitbox;

        this.speed = options.speed;
        this.game = options.game;
        
        if (options.game.pathfinder){
            this.pathfinder = options.game.pathfinder;
            this.ZONE = options.zone;
            this.navMeshGroup = this.pathfinder.getGroup(this.ZONE, this.object.position);	
        }
		
		// Look to the center of the map
		this.object.lookAt(new THREE.Vector3(0, this.object.position.y, 0));
        
		this.waypoints = options.waypoints;

		// Start Animation Mixer
		this.animations = {};	
        if (options.animations){
            this.mixer = new THREE.AnimationMixer(options.object);
            options.animations.forEach( (animation) => {
                this.animations[animation.name.toLowerCase()] = animation;
            })
        }
		this.raycaster = new THREE.Raycaster();

		// Shooting properties
		this.SHOOTING_COOLDOWN = 300; // value in milliseconds
		this.nextShot = Date().now;
		this.bullets = [];
		this.BULLET_SPEED = 80;
		this.bulletGeometry = new THREE.CapsuleGeometry(0.03, 1, 4, 8);
		this.bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x22FF22 });
		this.impacts = [];
		this.IMPACT_FADE_SPEED = 0.25; 

		// NPC properties
		this.MAX_HEALTH = 100;
		this.WEAPON_DAMAGE = 30;
		this.currentHealth = this.MAX_HEALTH;
		this.RESPAWN_TIMER = 15 * 1000;
		this.nextRespawn = Date.now();
		this.isDead = false;
		this.kills = 0;
		this.deaths = 0;

		// Player detection properties
		this.HUNT_DETECTION_RANGE = 24;		// Distance for when NPC will start following a player
		this.ALERT_DETECTION_RANGE = 8;		// Distance where an NPC will look to a player
		this.HUNT_FOV = 120;				// Angle in degrees for close detection
		this.ALERT_FOV = 360;				// Angle in degrees for alert detection
		this.DETECTION_INTERVAL = 0.4 * 1000;
		this.nextDetection = Date.now() + this.DETECTION_INTERVAL;
		this.currentTarget = null;			// Targeted player
		// Types of behaviour
		// Patrol - NPC walks to a random waypoint
		// Seek - NPC tries to find a player
		// Hunt - NPC follows a near player (only as a currentBehaviour)
		// Alert - NPC shoots a near player (only as a currentBehaviour)
		this.generalBehaviour = "patrol";
		this.currentBehaviour = "patrol";
	}

	setTargetDirection(pt){
		const player = this.object;
		pt.y = player.position.y;
		const quaternion = player.quaternion.clone();
		player.lookAt(pt);
		this.quaternion = player.quaternion.clone();
		player.quaternion.copy(quaternion);
	}
	
	newPath(pt){
        const player = this.object;
        
        if (this.pathfinder===undefined){
            this.calculatedPath = [ pt.clone() ];
            //Calculate target direction
            this.setTargetDirection( pt.clone() );
            this.action = 'run';
            return;
        }
        
		this.calculatedPath = this.pathfinder.findPath(player.position, pt, this.ZONE, this.navMeshGroup);
		if (this.calculatedPath?.length) {
			this.action = 'run';
			this.setTargetDirection( this.calculatedPath[0].clone() );
		} else {
			this.action = 'idle';
            if (this.pathfinder){
                const closestPlayerNode = this.pathfinder.getClosestNode(player.position, this.ZONE, this.navMeshGroup);
                const clamped = new THREE.Vector3();
                this.pathfinder.clampStep(
                    player.position, 
                    pt.clone(), 
                    closestPlayerNode, 
                    this.ZONE, 
                    this.navMeshGroup, 
                    clamped);
            }
		}
	} 
	
	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			if (this.object.rifle){
				this.object.rifle.quaternion.copy(WEAPON_ROTATIONS[name.toLowerCase()]);
				this.object.rifle.rotateX(1.5* Math.PI);
				this.object.rifle.rotateZ(Math.PI + 0.3);
				this.object.rifle.position.copy(WEAPON_POSITIONS[name.toLowerCase()]);
			}
			const action = this.mixer.clipAction( clip );
			if (name.includes('firing')){
				// Smoother animation
				action.clampWhenFinished = true;
				action.setLoop( THREE.LoopRepeat);
			}
			if(name.includes("death")){
				action.clampWhenFinished = true;
				action.setLoop(THREE.LoopOnce);
			}
			action.reset();
			const nofade = !this.actionName?.includes('firing');
			this.actionName = name.toLowerCase();
			action.play();
			if (this.currentAction){
				if (nofade){
					this.currentAction.enabled = false;
				}else{
					this.currentAction.crossFadeTo(action, 0.5);
				}
			}
			this.currentAction = action;
		}
	}
	
	takeDamage(damage){
		this.currentHealth -= damage;
		if(this.currentHealth <= 0){
			this.dead();
			return true;
		}
		console.log(this.name + " took " + damage + " damage. Current HP: " + this.currentHealth);
		return false;
	}

	dead(){
		console.log(this.name + " died.");
		this.isDead = true;
		this.deaths++;
		this.action = "death_badguy";
		this.calculatedPath = [];
		this.nextRespawn = Date.now() + this.RESPAWN_TIMER;
		this.hitbox.position.y = -100;
	}

	respawn(){
		this.currentHealth = this.MAX_HEALTH;
		this.isDead = false;
		this.object.position.copy(this.game.randomSpawnpoint);
		this.action = 'idle';
		this.hitbox.position.y = 0;
		this.currentBehaviour = this.generalBehaviour;
		console.log(this.name + " respawned.");
	}

	getNearPlayers(){
		players = this.game.players.filter(p => 
			((p.object && this.object.position.distanceTo(p.object.position) < this.ALERT_DETECTION_RANGE)
			||
			(p.model && this.object.position.distanceTo(p.model.position) < this.ALERT_DETECTION_RANGE))
			&& p.name !== this.name
			&& !p.isDead
		);
		if(players.length > 0)
			return {behaviour: "alert", players: players};

		var players = this.game.players.filter(p => 
			((p.object && this.object.position.distanceTo(p.object.position) < this.HUNT_DETECTION_RANGE)
			||
			(p.model && this.object.position.distanceTo(p.model.position) < this.HUNT_DETECTION_RANGE))
			&& p.name !== this.name
			&& !p.isDead
		);
		if(players.length > 0)
			return {behaviour: "hunt", players: players};
		
		return {behaviour: "none", players: []};
	}

	checkForPlayers(){
		const p = this.getNearPlayers();
		// if alerted check if target is within hunt range
		// if hunting check if target is closer to calculate new path
		// verify if there's a wall between
		if(p.behaviour == "alert"){
			// Keep hunting current target or a new one if current is gone
			if(!this.currentTarget || !p.players.includes(this.currentTarget)){
				// Get a random player
				this.currentTarget = p.players[Math.floor(Math.random()*p.players.length)];
			}
			const targetPosition = this.currentTarget.name.includes("Player") ? this.currentTarget.model.position : this.currentTarget.object.position;
			// Check if there's any mesh between the 2 players			
			const direction = (new THREE.Vector3()).subVectors(targetPosition, this.object.position);
			direction.normalize();
			const currentPosition = (new THREE.Vector3()).copy(this.object.position);
			currentPosition.y += 1.75;
			this.raycaster.set(currentPosition, direction);
			const intersections = this.raycaster.intersectObjects(this.game.scene.children);
			if(intersections.length > 0){
				const distance = this.object.position.distanceTo(targetPosition);
				for(let i = 0; i < intersections.length; i++){
					if(intersections[i].distance < distance 
						&& !intersections[i].object.name.includes("head")
						&& !intersections[i].object.name.includes("body")){
						this.currentBehaviour = "hunt";
						this.newPath(targetPosition);
						return;
					}
				}
			}
			// Stop and look at player
			this.currentBehaviour = "alert";
			this.calculatedPath = [];
			return;
		}
		if(p.behaviour == "hunt"){
			if(!this.currentTarget || !p.players.includes(this.currentTarget)){
				// Get a random player
				this.currentTarget = p.players[Math.floor(Math.random()*p.players.length)];
			}
			const targetPosition = this.currentTarget.name.includes("Player") ? this.currentTarget.model.position : this.currentTarget.object.position;
			this.currentBehaviour = "hunt";
			this.newPath(targetPosition);
			return;
		}
		this.currentTarget = null;
		this.currentBehaviour = this.generalBehaviour;
	}

	shoot(){
		console.log("pew");
		this.action = "firing";
		const targetPosition = this.currentTarget.name.includes("Player") ? this.currentTarget.model.position : this.currentTarget.object.position;
		this.object.lookAt(targetPosition);

		return;
		this.raycaster.setFromCamera( new THREE.Vector2(), this.camera);
		const hitPoint = new THREE.Vector3();
		var foundHit = false;
		var playerHit = null;
		var headShot = false;

		this.game.sortPlayers();
		for(let i = 0; i < this.game.players.length; i++){
			const player = this.game.players[i].object;
			if(player == undefined || this.game.players[i].isDead)
				continue;
			const hits = this.raycaster.intersectObjects(player.children);
			if (hits.length > 0){
				hitPoint.copy(hits[0].point);
				foundHit = true;
				playerHit = this.game.players[i];
				headShot = hits[0].object.name.includes("head");
				break;
			}
		}
		if(!foundHit){
			const hits = this.raycaster.intersectObjects(this.game.scene.children)
			if (hits.length > 1){
				hitPoint.copy(hits[1].point);
				foundHit = true;
			}
		}
		if(!foundHit)
			return;
		
		// Create bullet tracer
		const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial);
		this.model.rifle.attach(bullet);
		bullet.position.set(0, 20, -4);
		this.game.scene.attach(bullet);
		bullet.lookAt(hitPoint);
		bullet.rotateX(Math.PI/2);
		bullet.targetPoint = hitPoint;
		bullet.playerHit = playerHit;
		bullet.headShot = headShot;
		this.game.scene.add(bullet);
		this.bullets.push(bullet);
		
		this.light.intensity = 0.5;

	}

	updateBullets(dt){
		return;
		const bulletsToRemove = [];
		this.bullets.forEach( bullet => {
			const movement = this.BULLET_SPEED * dt;
			if(movement >= bullet.position.distanceToSquared(bullet.targetPoint)){
				// Check if it's hitting a player or the map
				if(bullet.playerHit && !bullet.playerHit.isDead){
					const damage = bullet.headShot ? this.WEAPON_HEAD_MODIFIER * this.WEAPON_DAMAGE : this.WEAPON_DAMAGE;
					if(bullet.playerHit.takeDamage(damage))
						this.kills++;
				}else{
					const impactMaterial = new THREE.MeshBasicMaterial( { color: 0x111111 } );
					impactMaterial.transparent = true;
					const sphere = new THREE.Mesh( this.impactGeometry, impactMaterial );
					sphere.position.copy(bullet.targetPoint);
					this.game.scene.add(sphere);
					this.impacts.push(sphere);
				}
				bulletsToRemove.push(bullet);
			}
			bullet.translateY(movement);
		});
		bulletsToRemove.forEach( bullet => {
			const idx = this.bullets.indexOf(bullet);
			this.bullets.splice(idx, 1);
			this.game.scene.remove(bullet);
		});
		if(this.light.intensity > 0){
			this.light.intensity -= 1 * dt;
		}
	}

	updateBehaviour(dt){
		if(this.currentBehaviour !== "alert")
			return;
		if(Date.now() < this.nextShot){
			return;
		}
		this.shoot();
		this.nextShot = Date.now() + this.SHOOTING_COOLDOWN;
	}

	updateMovement(dt){
		const speed = this.speed;
		const player = this.object;
		if (this.calculatedPath && this.calculatedPath.length) {
            const targetPosition = this.calculatedPath[0];

            const vel = targetPosition.clone().sub(player.position);
            // Ignore y as due to a bug the model can go underground
			vel.y = 0;
            let pathLegComplete = (vel.lengthSq() < 0.01);
            
            if (!pathLegComplete) {
				//Get the distance to the target before moving
                const prevDistanceSq = player.position.distanceToSquared(targetPosition);
                vel.normalize();
                // Move player to target
                if (this.quaternion) player.quaternion.slerp(this.quaternion, 0.1);
                player.position.add(vel.multiplyScalar(dt * speed));

				// Solution for pathfinding bug where it goes over/underground:
				// Check for Y position
				const pos = new THREE.Vector3();
				player.getWorldPosition(pos);
				pos.y += 2;
				this.raycaster.set(pos, new THREE.Vector3(0,-1,0));
				const intersectsDown = this.raycaster.intersectObject( this.game.navmesh );
				if(intersectsDown.length > 0){
					player.position.y = intersectsDown[0].point.y;
				}

				// Get distance to target after moving if greater then this leg is completed
                const newDistanceSq = player.position.distanceToSquared(targetPosition);
                pathLegComplete = newDistanceSq > prevDistanceSq; 
            } 
            
            if (pathLegComplete){
                // Remove node from the path we calculated
                this.calculatedPath.shift();
                if (this.calculatedPath.length==0){
                    if (this.waypoints !== undefined){
						if(this.currentBehaviour === "patrol")
                        	this.newPath(this.randomWaypoint);
						else if(this.currentBehaviour === "seek")
							this.newPath(this.randomPlayer);
                    }else{
                        player.position.copy( targetPosition );
                        this.action = 'idle';
                    }
                }else{
                    this.setTargetDirection( this.calculatedPath[0].clone() );
                }
            }
        }else{
            if (this.waypoints!==undefined){
				if(this.currentBehaviour === "patrol")
					this.newPath(this.randomWaypoint);
				else if(this.currentBehaviour === "seek")
					this.newPath(this.randomPlayer);
			} 
        }
	}

	update(dt){
		if (this.mixer) this.mixer.update(dt);
		
		if (this.isDead){
			if(this.nextRespawn <= Date.now())
				this.respawn();
			return;
		}
        this.updateMovement(dt);
		if(this.nextDetection <= Date.now()){
			this.checkForPlayers();
			this.nextDetection = Date.now() + this.DETECTION_INTERVAL;
		}
		this.updateBehaviour(dt);
		this.updateBullets(dt);
    }

	get randomPlayer(){
		return 1;
	}

	get randomWaypoint(){
		const index = Math.floor(Math.random()*this.waypoints.length);
		return this.waypoints[index];
	}
}

export { NPC };