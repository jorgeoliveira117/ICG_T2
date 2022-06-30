import * as THREE from '../libs/three.module.js';

const KEYS = {
	'a': 65,
	's': 83,
	'w': 87,
	'd': 68,
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

		this.keys = {};
		this.MOVEMENT_SPEED_FORWARD = 10;
		this.MOVEMENT_SPEED_SIDE = 7;

		this.UP = new THREE.Vector3(0, 1, 0);
		this.DOWN = new THREE.Vector3(0, -1, 0);
		this.STEP_SIZE = 0.5;

		document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
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

		const moveForward = (!!this.keys[KEYS.w] ? 1 : 0) + (!!this.keys[KEYS.s] ? -1 : 0);
		const moveSide = (!!this.keys[KEYS.a] ? 1 : 0) + (!!this.keys[KEYS.d] ? -1 : 0);
		
		if(moveForward !== 0){
			const newPosition = new THREE.Object3D();
			newPosition.position.copy(this.model.position);
			newPosition.rotation.copy(this.model.rotation);
			newPosition.translateZ(this.MOVEMENT_SPEED_FORWARD * moveForward * dt);

			const pos = new THREE.Vector3();
			newPosition.getWorldPosition(pos);
			pos.y += 2;
			this.raycaster.set(pos, this.DOWN);
			const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
			if(intersectsDOWN.length > 0){
				this.model.position.copy(newPosition.position);
				this.model.position.y = (intersectsDOWN[0].point.y) + 0.1;
				moved = true;
			}
		}
		if(moveSide !== 0){
			const newPosition = new THREE.Object3D();
			newPosition.position.copy(this.model.position);
			newPosition.rotation.copy(this.model.rotation);
			newPosition.translateX(this.MOVEMENT_SPEED_SIDE * moveSide * dt);

			const pos = new THREE.Vector3();
			newPosition.getWorldPosition(pos);
			pos.y += 2;
			this.raycaster.set(pos, this.DOWN);
			const intersectsDOWN = this.raycaster.intersectObject(this.navmesh);
			if(intersectsDOWN.length > 0){
				this.model.position.copy(newPosition.position);
				this.model.position.y = (intersectsDOWN[0].point.y) + 0.1;
				moved = true;
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
		this.updateCamera(dt);
		//console.log(this.camera.rotation);
    }
}

export { Player };