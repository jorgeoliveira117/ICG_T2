import * as THREE from '../libs/three.module.js';

const WEAPON_ROTATIONS = {
	"death_badguy": new THREE.Quaternion(-0.476, -0.536, 0.497, 0.488),
	"firing": new THREE.Quaternion(-0.436, 0.496, 0.697, 0.352),
	"idle": new THREE.Quaternion(-0.378, 0.371, 0.531, 0.662),
	"run": new THREE.Quaternion(-0.513, 0.375, 0.590, 0.498)
}


const WEAPON_POSITIONS = {
	"death_badguy": new THREE.Vector3(0,0,0),
	"firing": new THREE.Vector3(0, 16.777, -5.63),
	"idle": new THREE.Vector3(4.17, 23.777, 3.63),
	"run": new THREE.Vector3(0, 23.777, 3.63)
}

class NPC{
	
	constructor(options){
		this.name = options.name | "NPC"; 

		options.game.scene.add(options.object);
		
		this.object = options.object;

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
			//if (name=='firing'){
			//	// smoother animation repetition
			//	action.clampWhenFinished = true;
			//	action.setLoop( THREE.LoopOnce );
			//}
			action.reset();
			const nofade = this.actionName == 'firing';
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
	
	update(dt){
		const speed = this.speed;
		const player = this.object;
		
		if (this.mixer) this.mixer.update(dt);
		
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
				this.raycaster.set(player.position, new THREE.Vector3(0,-1,0));
				const intersectsDown= this.raycaster.intersectObject( this.game.navmesh );
				if(intersectsDown?.length > 0){
					player.position.y = intersectsDown[0].point.y;
				}else{
					this.raycaster.set(player.position, new THREE.Vector3(0,1,0));
					const intersectsUp = this.raycaster.intersectObject( this.game.navmesh );
					if(intersectsUp?.length > 0)
						player.position.y = intersectsUp[0].point.y;
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
                        this.newPath(this.randomWaypoint);
                    }else{
                        player.position.copy( targetPosition );
                        this.action = 'idle';
                    }
                }else{
                    this.setTargetDirection( this.calculatedPath[0].clone() );
                }
            }
        }else{
            //if (this.waypoints!==undefined) this.newPath(this.randomWaypoint);
        }
    }

	get randomWaypoint(){
		const index = Math.floor(Math.random()*this.waypoints.length);
		return this.waypoints[index];
	}
}

export { NPC };