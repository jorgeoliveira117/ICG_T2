import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { Pathfinding } from '../libs/pathfinding/Pathfinding.js';
import { NPCHandler } from './NPCHandler.js';
import { PlayerHandler } from './PlayerHandler.js';
import { UI } from './UI.js';
import { SFX } from '../libs/SFX.js';


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
	new THREE.Vector3(-61.81534402200036, 9.65949306492824, -13.94053832576816),
	new THREE.Vector3(15,367374159859995, 0.13086872720023987, -25.83172310111588),
	new THREE.Vector3(62.34140809325948, 7.482623797595264, -54.999164566232224),
	new THREE.Vector3(48.435177384372565, 0.13086895779146446, -27.547956931527427),
	new THREE.Vector3(40.309642201168174, 0.13086217325364627, 22.947691538861744),
	new THREE.Vector3(18.04145982801712, 0.1308626153971265, 19.656926220687602),
	new THREE.Vector3(7.091145577550936, 2.968009606331385, -55.3042752967659),
	new THREE.Vector3(-27.28994079204464, 0.5246734800679471, -9.621706730901685),
	new THREE.Vector3(-11.662348321981636, 0.13086463450176022, 4.629226418406633),
	new THREE.Vector3(29.391595073637458, 0.13086201725700922, 24.108736190385407),
	new THREE.Vector3(15.278785105850268, 0.7749511830811336, 7.472804883860588),
	new THREE.Vector3(22.096611800227407, 0.13086777660223578, -18.756655642322553),
	new THREE.Vector3(12.956612321783004, 0.13087013042707674, -36.2755957551204),
	new THREE.Vector3(13.261482211723019, 2.843369431653582, -35.824965827531344),
	new THREE.Vector3(41.22814373755527, 5.6835844020359545, -59.56945964529695),
	new THREE.Vector3(-27.59185082254201, 3.469044942448451, -53.77489684201319),
	new THREE.Vector3(-20.152713174282514, 5.687641550813858, -62.820709558364584),
	new THREE.Vector3(-35.72742858388672, 4.806866761116045, -65.02552953661598),
	new THREE.Vector3(-39.47568735436539, 3.4458651305455605, -49.51836851224594),
	new THREE.Vector3(-26.302204056035816, 2.263670167677122, 12.965616020622038),
	new THREE.Vector3(-40.96557102215755, 5.454154984186669, 12.644425135320363),
	new THREE.Vector3(-5.444350783202848, 3.2184465360082744, 29.912702332710335),
	new THREE.Vector3(5.59781689939693, 0.1308674310095692, -16.18449431407223),
	new THREE.Vector3(24.39663014025956, 0.28070552322804826, 3.526983324458903),
	new THREE.Vector3(48.240796570835364, 0.13086403081819875, 9.122294855095243),
	new THREE.Vector3(44.93488676647617, 0.13086906487640876, -28.344963868299356),
	new THREE.Vector3(29.435296779941886, 0.15847589235951348, -33.03911081635806),
	new THREE.Vector3(14.22768163417612, 13.631996090881916, 2.382638500187508),
	new THREE.Vector3(47.56092418026731, 13.633023695176975, -3.639940981682387),
	new THREE.Vector3(50.65812237644146, 0.13085808634976537, 53.36551324369552),
	new THREE.Vector3(39.131930708236524, 0.13086144912681663, 28.337189661984823),
	new THREE.Vector3(43.42528989628009, 0.130863192896427, 15.35874075384309),
	new THREE.Vector3(18.501221971333138, 0.1308633423847612, 14.24613582834311)
];

class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();

		this.assetsPath = '../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 500 );
		this.camera.position.set( 0, 50, 0 );
		this.camera.lookAt(new THREE.Vector3(0, 100, 0))
		
        
		let backgroundColor = 0x00ABFF;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( backgroundColor );
		//this.scene.fog = new THREE.Fog( 0xffffff, 50, 800 );

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


		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        //this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
		
		this.players = [];

        this.load();

		this.ui = new UI({
			game: this
		});

		this.isPaused = true;

		window.addEventListener('resize', this.resize.bind(this) );
	}

    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }

	initPathfinding(navmesh){
		this.pathfinder = new Pathfinding();
		this.pathfinder.setZoneData('map', Pathfinding.createZone(navmesh.geometry, 0.02));
		if(this.npcHandler?.gltf !== undefined) this.npcHandler.initNPCs();
		if(this.playerHandler?.gltf !== undefined) this.playerHandler.initPlayer();
	}
    
	load(){
		this.playerReady = false;
		this.npcsReady = false;
		this.environmentReady = false;
        this.loadEnvironment();
		this.player = new PlayerHandler(this);
		this.npcHandler = new NPCHandler(this);
    }

	loadSounds(){
		// https://threejs.org/docs/#api/en/audio/Audio
		this.listener = new THREE.AudioListener();
		this.camera.add(this.listener);
		this.sfx = new SFX(this.camera, `${this.assetsPath}sound/`, this.listener);
		this.sfx.load("ambience", true, 0.1, 0.1);
		this.players.forEach( player => player.loadSounds());
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
    
	sortPlayers(){
		if(!this.player)
			return;

		this.players.sort((a, b) => {
			if(a.name.includes("Player"))
				return 1;
			if(b.name.includes("Player"))
				return -1;
			const distToA = this.player.model.position.distanceToSquared(a.object.position);
			const distToB = this.player.model.position.distanceToSquared(b.object.position);
			if(distToA <= distToB)
				return -1;
			return 1;
		});
	}


	get randomSpawnpoint(){
		const index = Math.floor(Math.random()*SPAWN_POINTS.length);
		return SPAWN_POINTS[index];
	}

	startRendering(){
		this.ui.loadingUpdate();
		if(!this.playerReady || !this.npcsReady || !this.environmentReady)
			return;
		this.ui.loadingCompleted();
		this.renderer.setAnimationLoop(this.render.bind(this));
	}


	render() {
		const dt = this.clock.getDelta();
		if(this.player !== undefined)
			this.player.update(dt);
		if(this.npcHandler !== undefined)
			this.npcHandler.update(dt);
		//console.log(this.camera.position)
        this.renderer.render( this.scene, this.camera );

    }
}

export { Game };