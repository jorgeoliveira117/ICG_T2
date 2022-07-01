import * as THREE from '../libs/three.module.js';

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
		this.raycaster = new THREE.Raycaster();

		this.rifleDirection = new THREE.Quaternion(-0.476, -0.536, 0.497, 0.488);
		this.model.rifle.quaternion.copy(this.rifleDirection);
		this.model.rifle.rotateX(1.5* Math.PI);
		this.model.rifle.rotateZ(Math.PI);
		this.model.rifle.position.set(-28.779, -3.731, 0.99772);
		this.camera = this.game.camera;
		this.camera.position.copy(this.model.position);
		this.camera.rotation.copy(this.model.rotation);

		
		this.model.attach(this.camera);
		this.camera.rotateY(Math.PI);
		this.camera.position.set(0, 1.6, 0);
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
		this.JUMP_ACELERATION = 6.5;
		this.JUMP_HEIGHT = 2.57 / 2;
		this.CURRENT_JUMP_SPEED = 0;
		this.CURRENT_FALL_SPEED = 0;
		this.TARGET_JUMP_HEIGHT = 0;
		this.WEIGHT = 90;
		this.isAirborne = false;
		this.isJumping = false;
		this.isFalling = false;

		this.UP = new THREE.Vector3(0, 1, 0);
		this.DOWN = new THREE.Vector3(0, -1, 0);
		this.STEP_SIZE = 0.5;
		this.GRAVITY_STEP = 0.1;

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

	}
	
	onMouseMove(e) {
		e.preventDefault();
		var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
		var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
		/*
		if(gamePaused)
			return;
		*/
		// Change to game sensitivity
		this.model.rotateY(-movementX * 0.005);
		this.camera.rotateX(-movementY * 0.005);
		this.model.neck.rotateX(-movementY * 0.005);
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
		this.raycaster.setFromCamera( new THREE.Vector2(), this.camera);
		const geometry = new THREE.SphereGeometry( 0.1, 32, 16 );
		const material = new THREE.MeshBasicMaterial( { color: 0x55AAFF } );
		const sphere = new THREE.Mesh( geometry, material );
		const hitPoint = new THREE.Vector3();
		for(let i = 0; i < this.game.players.length; i++){
			const player = this.game.players[i].object;
			if(player == undefined)
				continue;
			const hits = this.raycaster.intersectObjects(player.children);
			if (hits.length > 0){
				hitPoint.copy(hits[0].point);
				break;
			}
		}
		//sphere.position.copy(this.raycaster.intersectObjects(this.game.scene.children)[0].point);
		sphere.position.copy(hitPoint);
		this.game.scene.add(sphere);
	}
	
	onMouseUp(e) {

	}

	// Change animation
	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
			if (name=='firing'){
				// smoother animation repetition
				action.clampWhenFinished = true;
				action.setLoop( THREE.LoopOnce );
			}
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
			if(intersects.length > 0)
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
		if(moved){
			this.moving = true;
			this.action = (this.isFiring) ? 'firingmove' : 'running';
		}else{
			this.moving = false;
			this.action = "idle";
		}
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
		if(this.isJumping){
			this.CURRENT_JUMP_SPEED -= dt * this.JUMP_ACELERATION;
			this.model.position.y += this.CURRENT_JUMP_SPEED * dt;
			if(this.model.position.y  >= this.TARGET_JUMP_HEIGHT){
				this.isJumping = false;
				this.isFalling = true;
				this.CURRENT_FALL_SPEED = 0;
			}
		}else{
			this.CURRENT_FALL_SPEED += dt * this.GRAVITY;
			this.model.position.y -= this.CURRENT_FALL_SPEED * dt;
			this.raycaster.set(this.model.position, this.DOWN);
			const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
			if(intersectsDOWN.length > 0 && intersectsDOWN[0].distance <= this.GRAVITY_STEP){
				this.model.position.y = intersectsDOWN[0].point.y;
				this.isFalling = false;
				this.isAirborne = false;
			}
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
		//const speed = this.speed;
		const player = this.model;
		
		if (this.mixer) this.mixer.update(dt);
		
		this.updateMovement(dt);
		this.updateGravity(dt);
		this.updateCamera(dt);
		//console.log(this.camera.rotation);
    }
}

export { Player };