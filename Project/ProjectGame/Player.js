import * as THREE from '../libs/three.module.js';
import { UI } from './UI.js';

const KEYS = {
	'a': 65,
	's': 83,
	'w': 87,
	'd': 68,
	'shift': 16,
	'space': 32,
};
  
// Sources:
// https://threejs.org/docs/#api/en/animation/AnimationMixer
// https://www.youtube.com/watch?v=3CYljFpF4ds
// https://github.com/donmccurdy/three-pathfinding
// https://github.com/simondevyoutube/ThreeJS_Tutorial_FirstPersonCamera/blob/main/main.js

class Player{
	constructor(options){
		this.name = "Player";
		
		options.game.scene.add(options.object);
		
		this.model = options.object;
        this.speed = options.speed;
        this.game = options.game;
        this.navmesh = this.game.navmesh;
		this.hitbox = options.hitbox;


		// Start Animation Mixer
		this.animations = {};	
        if (options.animations){
            this.mixer = new THREE.AnimationMixer(options.object);
            options.animations.forEach( (animation) => {
                this.animations[animation.name.toLowerCase()] = animation;
            })
        }

		// Rifle position fix
		this.rifleDirection = new THREE.Quaternion(-0.476, -0.536, 0.497, 0.488);
		this.model.rifle.quaternion.copy(this.rifleDirection);
		this.model.rifle.rotateX(1.5* Math.PI);
		this.model.rifle.rotateZ(Math.PI);
		this.model.rifle.position.set(-28.779, -3.731, 0.99772);

		// Camera position
		this.camera = this.game.camera;
		this.setCameraPosition();
		
		// Camera bobbing properties
		this.headBobbingSpeed = 0.07;
		this.headBobbingBoundMin = 1.57;
		this.headBobbingBoundMax = 1.65;
		this.headBobbingBound = 1.6;
		this.moving = false;

		// Movement related properties
		this.keys = {};
		this.MOVEMENT_SPEED_RUN = 1.6;
		this.MOVEMENT_SPEED_FORWARD = 8;
		this.MOVEMENT_SPEED_SIDE = 5;
		this.MOVEMENT_SPEED_AIRBORNE = 0.8;
		this.GRAVITY = 9.8;
		this.JUMP_SPEED = 4.6;
		this.JUMP_ACELERATION = 7.1;
		this.JUMP_HEIGHT = 2.57 / 2;
		this.CURRENT_JUMP_SPEED = 0;
		this.CURRENT_FALL_SPEED = 0;
		this.TARGET_JUMP_HEIGHT = 0;
		this.WEIGHT = 90;
		this.isAirborne = false;
		this.isJumping = false;
		this.isFalling = false;
		this.sensitivity = 0.004;

		// Raycaster properties
		this.raycaster = new THREE.Raycaster();
		this.STEP_SIZE = 0.5;
		this.GRAVITY_STEP = 0.1;
		this.UP = new THREE.Vector3(0, 1, 0);
		this.DOWN = new THREE.Vector3(0, -1, 0);

		// Shooting properties
		this.SHOOTING_COOLDOWN = 300; // value in milliseconds
		this.nextShot = Date().now;
		this.bullets = [];
		this.BULLET_SPEED = 80;
		this.bulletGeometry = new THREE.CapsuleGeometry(0.03, 1, 4, 8);
		this.bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFF2222 });
		this.bulletMaterial = new THREE.MeshPhongMaterial({ 
			color: 0xFF2222,
			emissive: 0xFF0000,
			specular: 0xFFFFFF,
			shininess: 30
		}); 
		this.impacts = [];
		this.IMPACT_FADE_SPEED = 0.25; 
		
		this.impactGeometry = new THREE.SphereGeometry( 0.05, 4, 2 );

		// Player properties
		this.MAX_HEALTH = 400;
		this.KILL_HEAL = 60;	// Health gained after elimating an enemy
		this.WEAPON_DAMAGE = 25;
		this.WEAPON_HEAD_MODIFIER = 3;
		this.currentHealth = this.MAX_HEALTH;
		this.RESPAWN_TIMER = 10 * 1000;
		this.nextRespawn = Date.now();
		this.isDead = false;
		this.kills = 0;
		this.deaths = 0;

		// Weapon Light
		this.light = new THREE.PointLight(0xFF5500, 0, 6);
		this.model.rifle.add(this.light);
		this.light.position.set(-1, 0, -4);

		// Listeners
		document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
		document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
		document.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
		document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
		document.addEventListener('keyup', (e) => this.onKeyUp(e), false);

		this.element = document.querySelector("#game");

		// https://www.html5rocks.com/en/tutorials/pointerlock/intro/
		this.element.requestPointerLock = this.element.requestPointerLock ||
						this.element.mozRequestPointerLock ||
						this.element.webkitRequestPointerLock;

		// Ask the browser to release the pointer
		document.exitPointerLock = document.exitPointerLock ||
					document.mozExitPointerLock ||
					document.webkitExitPointerLock;

		//this.element.requestPointerLock();
		this.ui = this.game.ui;
		this.ui.setPlayer(this);
	}
	
	setCameraPosition(){
		this.camera.position.copy(this.model.position);
		this.camera.rotation.copy(this.model.rotation);
		this.model.attach(this.camera);
		this.camera.rotation.set(0, 0, 0);
		this.camera.rotateY(Math.PI);
		this.camera.position.set(0, 1.6, 0);
	}

	onMouseMove(e) {
		e.preventDefault();
		if(this.isDead)
			return;
		var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
		var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
		/*
		if(gamePaused)
			return;
		*/
		// Change to game sensitivity
		this.model.rotateY(-movementX * this.sensitivity);
		this.camera.rotateX(-movementY * this.sensitivity);
		this.model.neck.rotateX(-movementY * this.sensitivity);
		if(this.camera.rotation.x > 0 && this.camera.rotation.x < Math.PI / 2)
			this.camera.rotation.x = Math.PI / 2;
		if(this.camera.rotation.x < 0 && this.camera.rotation.x > -2.34)
			this.camera.rotation.x = -2.34;	
	}

	onKeyDown(e) {
		this.keys[e.keyCode] = true;
		this.element.requestPointerLock();
	}
	
	onKeyUp(e) {
		this.keys[e.keyCode] = false;
	}

	onMouseDown(e) {
		this.isFiring = true;
	}
	
	onMouseUp(e) {
		this.isFiring = false;
	}

	// Change animation
	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
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

	shoot(dt){
		if(!this.isFiring || Date.now() < this.nextShot)
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
		//bullet.position.set(0, 70, -6);
		bullet.position.set(-4, 65, -4);
		this.game.scene.attach(bullet);
		bullet.lookAt(hitPoint);
		bullet.rotateX(Math.PI/2);
		bullet.targetPoint = hitPoint;
		bullet.playerHit = playerHit;
		bullet.headShot = headShot;
		this.game.scene.add(bullet);
		this.bullets.push(bullet);
		
		this.light.intensity = 1.4;

		this.nextShot = Date.now() + this.SHOOTING_COOLDOWN;
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
		if(this.isAirborne 
			|| !!this.keys[KEYS.w] || !!this.keys[KEYS.s]
			|| !!this.keys[KEYS.a] || !!this.keys[KEYS.d])
			this.action = 'deathnormal';
		else
			this.action = 'deathstanding';
		this.calculatedPath = [];
		this.nextRespawn = Date.now() + this.RESPAWN_TIMER;
		this.model.neck.attach(this.camera);
		this.hitbox.position.y = -100;
	}
	
	respawn(){
		this.currentHealth = this.MAX_HEALTH;
		this.isDead = false;
		this.model.position.copy(this.game.randomSpawnpoint);
		this.action = 'idle';
		this.hitbox.position.y = 0;
		this.setCameraPosition();
		console.log(this.name + " respawned.");
	}


	updateBullets(dt){
		const bulletsToRemove = [];
		this.bullets.forEach( bullet => {
			const movement = this.BULLET_SPEED * dt;
			if(movement >= bullet.position.distanceTo(bullet.targetPoint)){
				// Check if it's hitting a player or the map
				if(bullet.playerHit && !bullet.playerHit.isDead){
					const damage = bullet.headShot ? this.WEAPON_HEAD_MODIFIER * this.WEAPON_DAMAGE : this.WEAPON_DAMAGE;
					if(bullet.playerHit.takeDamage(damage)){
						this.kills++;
						this.currentHealth = Math.min(this.currentHealth + this.KILL_HEAL, this.MAX_HEALTH) ;
					}
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
			this.light.intensity -= 2 * dt;
		}
	}

	updateImpacts(dt){
		const impactsToRemove = [];
		this.impacts.forEach( impact => {
			impact.material.opacity -= this.IMPACT_FADE_SPEED * dt;
			if(impact.material.opacity <= 0)
				impactsToRemove.push(impact);
		});
		impactsToRemove.forEach( impact => {
			const idx = this.impacts.indexOf(impact);
			this.impacts.splice(idx, 1);
			this.game.scene.remove(impact);
		});
	}

	updateMovement(dt){
		let moved = false;
		// Jump
		if(!!this.keys[KEYS.space] && !this.isAirborne){
			this.isJumping = true;
			this.isAirborne = true;
			this.CURRENT_JUMP_SPEED = this.JUMP_SPEED;
			// Calculate jump height
			const position = new THREE.Vector3();
			position.copy(this.model.position);
			position.y += 2;
			this.raycaster.set(position, this.UP);
			const intersects = this.raycaster.intersectObjects(this.game.scene.children);
			if(intersects.length > 0 && intersects[0].distance < this.model.position.y + this.JUMP_HEIGHT)
				this.TARGET_JUMP_HEIGHT = this.model.position.y + intersects[0].distance;
			else
				this.TARGET_JUMP_HEIGHT = this.model.position.y + this.JUMP_HEIGHT;
		}

		// Leg Movement
		const moveForward = (!!this.keys[KEYS.w] ? 1 : 0) + (!!this.keys[KEYS.s] ? -1 : 0);
		const moveSide = (!!this.keys[KEYS.a] ? 1 : 0) + (!!this.keys[KEYS.d] ? -1 : 0);
		const runningSpeed = !!this.keys[KEYS.shift] ? this.MOVEMENT_SPEED_RUN : 1;
		const airborneSpeed = this.isAirborne ? this.MOVEMENT_SPEED_AIRBORNE : 1;
		if(moveForward !== 0){
			moved = true;
			const newPosition = new THREE.Object3D();
			newPosition.position.copy(this.model.position);
			newPosition.rotation.copy(this.model.rotation);
			newPosition.translateZ(this.MOVEMENT_SPEED_FORWARD * runningSpeed * airborneSpeed * moveForward * dt);
			const pos = new THREE.Vector3();
			newPosition.getWorldPosition(pos);
			pos.y += 2;
			this.raycaster.set(pos, this.DOWN);
			const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
			if(intersectsDOWN.length > 0){
				this.model.position.copy(newPosition.position);
				if(!this.isAirborne){
					if(intersectsDOWN[0].distance > this.STEP_SIZE + 2){
						this.isFalling = true;
						this.isAirborne = true;
					}
					else
						this.model.position.y = intersectsDOWN[0].point.y;
				}
					
				moved = true;
			}
		}
		if(moveSide !== 0){
			moved = true;
			const newPosition = new THREE.Object3D();
			newPosition.position.copy(this.model.position);
			newPosition.rotation.copy(this.model.rotation);
			newPosition.translateX(this.MOVEMENT_SPEED_SIDE * runningSpeed * airborneSpeed * moveSide * dt);
			const pos = new THREE.Vector3();
			newPosition.getWorldPosition(pos);
			pos.y += 2;
			this.raycaster.set(pos, this.DOWN);
			const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
			if(intersectsDOWN.length > 0){
				this.model.position.copy(newPosition.position);
				if(!this.isAirborne){
					if(intersectsDOWN[0].distance > this.STEP_SIZE + 2){
						this.isFalling = true;
						this.isAirborne = true;
					}
					else
						this.model.position.y = intersectsDOWN[0].point.y;
				}
			}
		}
		this.moving = moved;
		if(moved)
			this.action = (this.isFiring) ? 'firingmove' : 'running';
		else
			this.action = (this.isFiring) ? 'firinginplace' : 'idle';
	}
	
	updateGravity(dt){
		// Checks if model is falling under the ground, may happen due to a navmesh bug
		if(this.model.position.y < 0){
			this.model.position.y = 100;
			this.raycaster.set(this.model.position, this.DOWN);
			const intersects = this.raycaster.intersectObject(this.navmesh);
			if(intersects.length > 0){
				this.model.position.y = intersects[intersects.length-1].point.y;
			}else{
				this.model.position.copy(this.game.randomSpawnpoint);
			}
			this.isFalling = false;
			this.isJumping = false;
			this.isAirborne = false;
		}
		if(!this.isAirborne)
			return;
		// Check if it's still in bounds
		const point = new THREE.Vector3();
		point.copy(this.model.position);
		point.y += 2;
		this.raycaster.set(point, this.DOWN);
		const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
		if(intersectsDOWN.length > 0 && intersectsDOWN[0].distance <= 2 ){
			this.model.position.y = intersectsDOWN[0].point.y;
			this.isFalling = false;
			this.isAirborne = false;
		}
		// Apply Y transformation
		if(this.isJumping){
			this.CURRENT_JUMP_SPEED -= dt * this.JUMP_ACELERATION;
			this.model.position.y += this.CURRENT_JUMP_SPEED * dt;
			if(this.model.position.y  >= this.TARGET_JUMP_HEIGHT || this.CURRENT_JUMP_SPEED < 0){
				this.isJumping = false;
				this.isFalling = true;
				this.CURRENT_FALL_SPEED = 0;
			}
		}else{
			this.CURRENT_FALL_SPEED += dt * this.GRAVITY;
			this.model.position.y -= this.CURRENT_FALL_SPEED * dt;
		}
		
	}

	updateCamera(dt){
		if(!this.moving)
			return;
		this.camera.position.y += dt * this.headBobbingSpeed;
		if(this.camera.position.y > this.headBobbingBoundMax){
			this.camera.position.y = this.headBobbingBoundMax;
			this.headBobbingSpeed *= -1;
		}
		else if(this.camera.position.y < this.headBobbingBoundMin){
			this.camera.position.y = this.headBobbingBoundMin;
			this.headBobbingSpeed *= -1;
		}

	}

	update(dt){
		if (this.mixer) this.mixer.update(dt);
		
		this.updateBullets(dt);
		this.updateImpacts(dt);
		this.updateGravity(dt);

		if (this.isDead){
			if(this.nextRespawn <= Date.now())
				this.respawn();
			return;
		}

		this.updateMovement(dt);
		this.updateCamera(dt);
		this.shoot(dt);
		
		//console.log(this.camera.rotation);
    }
}

export { Player };