//Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for the camera to move around the scene
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// Create a scene, camera, and renderer
const scene = new THREE.Scene(); // it creates the 'space' where the 3D objects will be placed
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // it creates the 'point of view' from which the scene is observed

const loader = new GLTFLoader();

let object;
let controls;

//Load the file
loader.load(
    `./aston_martin_f1_amr23_2023/scene.gltf`,
    function (gltf) {
      //If the file is loaded, add it to the scene
      object = gltf.scene;
      scene.add(object);
    },
    function (xhr) {
      //While it is loading, log the progress
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      //If there is an error, log it
      console.error(error);
    }
);

//Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({alpha: true}); // it puts everything together and displays it on the screen (alpha allows for transparent background) {alpha: true}
renderer.setSize(window.innerWidth, window.innerHeight);

//Add the renderer to the DOM
document.getElementById("container3D").appendChild(renderer.domElement);

//Set how far the camera will be from the 3D model
camera.position.z = 3;

//Add lights to the scene, so we can actually see the 3D model
const topLight = new THREE.DirectionalLight(0xffffff, 20); // (color, intensity)
topLight.position.set(50, 50, 50) //top-left-ish
topLight.castShadow = false;
scene.add(topLight);

const ambientLight = new THREE.AmbientLight(0xf3f1f1, 25);
scene.add(ambientLight);


controls = new OrbitControls(camera, renderer.domElement);

//Keep track of the mouse position, so we can make the eye move
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

//Render the scene
var time = 0;
function animate() {
    requestAnimationFrame(animate);

    // Rotate object by a small angle per frame
    if (object) {
      time += 0.01;
      object.rotation.y = -Math.PI/2;
      //object.rotation.x = Math.PI/6;


      object.rotation.y += 0.01;


      //object.rotation.y += 0.01; // Rotate object by 0.01 radians per frame
      //if (object.rotation.y >= Math.PI * 2) {
      //    object.rotation.y -= Math.PI * 2; // Reset rotation to 0 once it completes a full rotation (360 degrees)
      //}
      //I've played with the constants here until it looked good 
      //object.rotation.y = -3 + mouseX / window.innerWidth * 3;
      //object.rotation.x = -1.2 + mouseY * 2.5 / window.innerHeight;
    }
    renderer.render(scene, camera);
  }
  
  //Add a listener to the window, so we can resize the window and the camera
  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  //add mouse position listener, so we can make the eye move
  document.onmousemove = (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  }

animate();