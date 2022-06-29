import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { RGBELoader } from '../libs/RGBELoader.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { Pathfinding } from '../libs/pathfinding/Pathfinding.js';
import { NPCHandler } from './NPCHandler.js';
import { PlayerHandler } from './PlayerHandler.js';


class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();


		this.assetsPath = '../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 700 );
		this.camera.position.set( -100, 100, -150 );
		// Grass
		//this.camera.position.set( -1, 10, -1 );
		// Mountain
		//this.camera.position.set( 20, 5, 50 );
		// Sand
		//this.camera.position.set( 53, 7.65, -61 );
        
		let backgroundColor = 0x00ABFF;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( backgroundColor );
		//this.scene.fog = new THREE.Fog( backgroundColor, 100, 200 );

		const ambient = new THREE.HemisphereLight(0xffffff, 0xaaaaff, 0.7);
		this.scene.add(ambient);

        //Add light with shadow
		const light = new THREE.DirectionalLight();
		light.position.set(-40, 120, 100);
		light.castShadow = true;

		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.height = 1024;
		light.shadow.camera.near = 25;
		light.shadow.camera.far = 500;
		light.shadow.bias = 0.0001

		const d = 125;
		light.shadow.camera.left = -d;
		light.shadow.camera.bottom = -d;
		light.shadow.camera.right = light.shadow.camera.top = d;

		this.scene.add(light);
		this.light = light;

		// Camera helper to visualize shadows
		//const helper = new THREE.CameraHelper(light.shadow.camera);
		//this.scene.add(helper);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        //this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        //this.setEnvironment();
        
        const controls = new OrbitControls( this.camera, this.renderer.domElement );
        
        this.load();
		
		window.addEventListener('resize', this.resize.bind(this) );
        
	}
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType ).setPath(this.assetsPath);
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
    }

	initPathfinding(navmesh){
		this.pathfinder = new Pathfinding();
		this.pathfinder.setZoneData('map', Pathfinding.createZone(navmesh.geometry, 0.02));
		//if(this.npcHandler?.gltf !== undefined) this.npcHandler.initNPCs();
		if(this.playerHandler?.gltf !== undefined) this.playerHandler.initPlayer();
	}
    
	load(){
        this.loadEnvironment();
		this.playerHandler = new PlayerHandler(this);
		//this.npcHandler = new NPCHandler(this);
    }

	startRendering(){
		this.renderer.setAnimationLoop(this.render.bind(this));
	}

    loadEnvironment(){
    	const loader = new GLTFLoader( ).setPath(this.assetsPath);
        
		// Load GLTF map
		loader.load(
			// resource path
			'mapv5.glb',
			gltf => {
				this.scene.add(gltf.scene);
				this.map = gltf.scene;

				const mergeObjects = {};
				
				gltf.scene.traverse(child => {
					if(child.isMesh){
						//console.log(child.name);
						if(child.name.includes("NavMesh")){
							console.log("Found a navmesh");
							this.navmesh = child;
							child.material.transparent = true;
							child.material.opacity = 0.3;
							//child.material.visible = false;
						}
						else{
							child.castShadow = true;
							child.receiveShadow = true;
							if(mergeObjects[child.material.name] == undefined){
								mergeObjects[child.material.name] = [];
							}
							mergeObjects[child.material.name].push(child);
						}
					}
				});

				this.scene.add(this.navmesh);
				this.initPathfinding(this.navmesh);

				for(let mat in mergeObjects){
					//console.log(mat + " - " +  mergeObjects[mat].length)
					const objects = mergeObjects[mat];
					let material, color;
					objects.forEach(object => {
						if(material == undefined){
							if(mat.includes("Terrain")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_basecolor.jpg");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(256, 256);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;

								const ambientOcclusion = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_ambientOcclusion.jpg");
								const height = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_normal.jpg");
								const roughness = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_roughness.jpg");

								material = new THREE.MeshLambertMaterial( { 
									map: baseColor,
									aoMap: ambientOcclusion
								});
								/*
								material = new THREE.MeshLambertMaterial( { 
									map: baseColor,
									normalMap: normal,
									displacementMap: height,
									displacementScale: 0.5,
									roughnessMap: roughness,
									roughness: 0.5,
									aoMap: ambientOcclusion
								});
								*/
							}
							else if(mat.includes("Mountain")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/snow/Snow_001_COLOR.jpg");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(128, 128);
								baseColor.anisotropy = 16;
								//baseColor.encoding = THREE.sRGBEncoding;

								const ambientOcclusion = textureLoader
									.load(this.assetsPath + "textures/snow/Snow_001_OCC.jpg");
								const height = textureLoader
									.load(this.assetsPath + "textures/snow/Snow_001_DISP.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/snow/Snow_001_NORM.jpg");
								const roughness = textureLoader
									.load(this.assetsPath + "textures/snow/Snow_001_ROUGH.jpg");

								material = new THREE.MeshLambertMaterial( { 
									map: baseColor,
									aoMap: ambientOcclusion
								});
								/*
								material = new THREE.MeshLambertMaterial( { 
									map: baseColor,
									normalMap: normal,
									displacementMap: height,
									displacementScale: 0.5,
									roughnessMap: roughness,
									roughness: 0.5,
									aoMap: ambientOcclusion
								});
								*/
							}
							else if(mat.includes("Orange_3")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_basecolor.jpg");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(64, 64);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;

								const ambientOcclusion = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_ambientOcclusion.jpg");
								const height = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_height.png.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_normal.jpg");
								const roughness = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_roughness.jpg");
								/*
								material = new THREE.MeshLambertMaterial( { 
									map: baseColor,
									aoMap: ambientOcclusion
								});
								*/
								material = new THREE.MeshStandardMaterial( { 
									map: baseColor,
									normalMap: normal,
									displacementMap: height,
									displacementScale: 0.5,
									roughnessMap: roughness,
									roughness: 0.5,
									aoMap: ambientOcclusion
								});
							}
							else{
								//console.log(object.material.map)
								material = new THREE.MeshPhongMaterial({ 
									color: object.material.color,
									shininess: 10
								});
							}
						}
						object.material = material;
					})
				}

				this.renderer.setAnimationLoop(this.render.bind(this));
			},
			xhr => {

			},
			err => {
				console.error( err );
			}
		);
	}			
    
	render() {
		const dt = this.clock.getDelta();

		if(this.playerHandler !== undefined)
			this.playerHandler.update(dt);
		//console.log(this.camera.position)
        this.renderer.render( this.scene, this.camera );
    }
}

export { Game };