import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { RGBELoader } from '../libs/RGBELoader.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { FirstPersonControls } from '../libs/FirstPersonControls.js';
import { Pathfinding } from '../libs/pathfinding/Pathfinding.js';
import { NPCHandler } from './NPCHandler.js';
import { PlayerHandler } from './PlayerHandler.js';

const SPAWN_POINTS = [
	new THREE.Vector3(-59.89253460336165, 4.801882704642674, -64.02237971170358),
	new THREE.Vector3(-59.89253460336165, 4.801882704642674, -64.02237971170358),
	new THREE.Vector3(48.23330137765365, 2.5053315403517527, -45.91246836694988),
	new THREE.Vector3(6.117558460257719, 0.13086750604633665, -16.74297454263569),
	new THREE.Vector3(2.5212040794956607, 4.312172060219335, 37.67442985246025),
	new THREE.Vector3(-43.506370164704535, 4.704693220507739, 10.533826885014435),
	new THREE.Vector3(51.4278128024145, 0.1355361954812651, 50.63703831154808),
	new THREE.Vector3(18.372744888597296, 0.13086730040838518, -15.212461781497977),
	new THREE.Vector3(8.661079461473328, 13.636080965519941, -28.464553121437188),
	new THREE.Vector3(-61.81534402200036, 9.65949306492824, -13.94053832576816)
];

class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();


		this.assetsPath = '../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 700 );
		//this.camera.position.set( -100, 100, -150 );
		// Grass
		this.camera.position.set( -1, 3, 2 );
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
        
        //const controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls = new FirstPersonControls(this.camera, this.renderer.domElement);
		this.controls.lookSpeed = 0.2;
		this.controls.movementSpeed = 8;
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
		if(this.npcHandler?.gltf !== undefined) this.npcHandler.initNPCs();
		if(this.playerHandler?.gltf !== undefined) this.playerHandler.initPlayer();
	}
    
	load(){
        this.loadEnvironment();
		this.playerHandler = new PlayerHandler(this);
		this.npcHandler = new NPCHandler(this);
    }

	startRendering(){
		this.renderer.setAnimationLoop(this.render.bind(this));
	}

    loadEnvironment(){
    	const loader = new GLTFLoader( ).setPath(this.assetsPath);
        
		// Load GLTF map
		loader.load(
			// resource path
			'mapv6.glb',
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
							child.material.visible = false;
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

				const baseColor = (new THREE.TextureLoader()).load(this.assetsPath + "skybox.png");
				const geometry = new THREE.SphereGeometry( 400, 32, 16 );
				const material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: baseColor } );
				material.visible = true;
				const sphere = new THREE.Mesh( geometry, material );
				this.scene.add(sphere);

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
								baseColor.repeat.set(256, 512);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								baseColor.minFilter = THREE.NearestMipMapLinearFilter;
								baseColor.magFilter = THREE.NearestFilter;

								const ambientOcclusion = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_ambientOcclusion.jpg");
								const height = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_normal.jpg");
								const roughness = textureLoader
									.load(this.assetsPath + "textures/grass/Stylized_Grass_003_roughness.jpg");

								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.25;
								material.normalMap = normal;
								material.aoMap = ambientOcclusion;
								material.aoMapIntensity = 0.5;
								material.specularMap = roughness;
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

								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.25;
								material.normalMap = normal;
								material.aoMap = ambientOcclusion;
								material.aoMapIntensity = 0.5;
								material.specularMap = roughness;
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
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_normal.jpg");
								const roughness = textureLoader
									.load(this.assetsPath + "textures/sand/Stylized_Sand_001_roughness.jpg");
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.5;
								material.normalMap = normal;
								material.aoMap = ambientOcclusion;
								material.aoMapIntensity = 0.5;
								material.specularMap = roughness;
							}
							else if(mat.includes("Wood_1")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/stone/TexturesCom_Pavement_CobblestoneMedieval11_4x4_512_albedo.png");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(4, 8);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								const height = textureLoader
									.load(this.assetsPath + "textures/stone/TexturesCom_Pavement_CobblestoneMedieval11_4x4_512_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/stone/TexturesCom_Pavement_CobblestoneMedieval11_4x4_512_normal.png");
							
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.8;
								material.normalMap = normal;
							}
							else if(mat.includes("Barrier")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/brick/TexturesCom_BrickRound0044_1_seamless_S.jpg");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(16, 16);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
							}
							else if(mat.includes("Brown_10")){		
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/rough_sand/TexturesCom_Ground_SandRoughSliding1_1x1_512_albedo.png");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(64, 64);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								const height = textureLoader
									.load(this.assetsPath + "textures/rough_sand/TexturesCom_Ground_SandRoughSliding1_1x1_512_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/rough_sand/TexturesCom_Ground_SandRoughSliding1_1x1_512_normal.png");
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.5;
								material.normalMap = normal;
							}
							else if(mat.includes("SandyWalls")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/smooth_sand/TexturesCom_Ground_Sand1_2x2_512_albedo.png");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(256, 256);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								const height = textureLoader
									.load(this.assetsPath + "textures/smooth_sand/TexturesCom_Ground_Sand1_2x2_512_height.png");
								const normal = textureLoader
									.load(this.assetsPath + "textures/smooth_sand/TexturesCom_Ground_Sand1_2x2_512_normal.png");
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
								material.bumpMap = height;
								material.bumpScale = 0.5;
								material.normalMap = normal;
							}
							else if(mat.includes("Building")){
								const textureLoader = new THREE.TextureLoader();
								const baseColor = textureLoader
									.load(this.assetsPath + "textures/planks/TexturesCom_WoodPlanksOld0250_3_seamless_S.jpg");
								baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
								baseColor.repeat.set(32, 16);
								baseColor.anisotropy = 16;
								baseColor.encoding = THREE.sRGBEncoding;
								baseColor.rotation = Math.PI/2;
								material = new THREE.MeshPhongMaterial();
								material.map = baseColor;
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
				this.environmentReady = true;
				this.startRendering();
			},
			xhr => {
			},
			err => {
				console.error( err );
			}
		);
	}				
    
	get randomSpawnpoint(){
		const index = Math.floor(Math.random()*SPAWN_POINTS.length);
		return SPAWN_POINTS[index];
	}

	render() {
		const dt = this.clock.getDelta();
		this.controls.update(dt);
		if(this.playerHandler !== undefined)
			this.playerHandler.update(dt);
		if(this.npcHandler !== undefined)
			this.npcHandler.update(dt);
		//console.log(this.camera.position)
        this.renderer.render( this.scene, this.camera );
    }
}

export { Game };