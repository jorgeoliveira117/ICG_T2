import {Player} from './Player.js';
import {GLTFLoader} from '../libs/GLTFLoader.js';
import {DRACOLoader} from '../libs/DRACOLoader.js';
import {Skeleton, Raycaster} from '../libs/three.module.js';

class PlayerHandler{
    constructor( game ){
        this.game = game;
        this.waypoints = game.waypoints;
        this.load();
		this.initMouseHandler();
	}

	// Adapted from
	// https://threejs.org/docs/#api/en/core/Raycaster
	initMouseHandler(){
		const raycaster = new Raycaster();
    	this.game.renderer.domElement.addEventListener( 'click', raycast, false );
			
    	const self = this;
    	const mouse = { x:0, y:0 };
    	
    	function raycast(e){
    		// Get pointer coordinates in viewport
			mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
			mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

			// Raycast from camera to pointer position
			raycaster.setFromCamera( mouse, self.game.camera );    

			// Check if there's an intersection with the navmesh
			const intersects = raycaster.intersectObject( self.game.navmesh );
			
			if (intersects.length > 0){
				const point = intersects[0].point;
				console.log(point);
				//self.player.newPath(point, true);
			}	
		}
    }

    load(){
        const loader = new GLTFLoader( ).setPath(`${this.game.assetsPath}models/`);
		const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( '../libs/draco/' );
        loader.setDRACOLoader( dracoLoader );
		loader.load(
			`player_headless.glb`,
			gltf => {
				if (this.game.pathfinder){
					this.initPlayer(gltf);
				}else{
					this.gltf = gltf;
				}
			},
			xhr => {
			},
			err => {
				console.error( err );
			}
		);
	}
    
	initPlayer(gltf = this.gltf){

		if(!gltf)
			return;
		const object = gltf.scene;
		object.frustumCulled = false;

		object.traverse(child=> {
			if(child.name.includes("Rifle"))
				object.rifle = child;
			if(child.name.includes("Neck"))
				object.neck = child;
			if(child.isMesh){
				child.castShadow = true;
				if(child.name.includes("Alpha")){
					child.frustumCulled = false;
				}
				if(child.name.includes("R_Sight")){
					child.visible = false;
				}
				if(child.name.includes("R_Bullet")){
					child.visible = false;
					object.bullet = child;
				}
			}
		});

		const options = {
			object,
			speed: 5.2,
			animations: gltf.animations,
			game: this.game,
		};

		const player = new Player(options);
		player.action = 'idle';

		const spawnPosition = this.game.randomSpawnpoint;
		player.model.position.copy(spawnPosition);
		//player.model.position.set(0, 0, 0);
		this.player = player;

		this.game.startRendering();
	}

    update(dt){
        if (this.player)
			this.player.update(dt);
    }
}

export { PlayerHandler };