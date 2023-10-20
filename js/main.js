import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { DxfParser } from "dxf-parser";

import { getEntityGroups } from "./entity-group";


const gui = new GUI();
const lightsFolder = gui.addFolder("Lights");
const globalFolder = gui.addFolder('Global');

let dxf_contents = null;

// 导入文件的函数
function importFile(event) {
  const file = event.target.files[0];
  reader.onload = function (e) {
    dxf_contents = e.target.result;
    // 在这里处理导入文件的逻辑
    updateModel(dxf_contents);
  };

  reader.readAsText(file);
}
const controller = {
  import: () => {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".dxf"; // 只接受文本文件，可以根据需要更改
    fileInput.addEventListener("change", importFile);
    fileInput.click();
  },
  update: () => {
    if (dxf_contents!=null){
      updateModel(dxf_contents);
    }else{
      initText()
    }
  },
  type: "LINE",
}
globalFolder.add(controller,"type",["MESH","LINE","POINT"])
  .name("Model Type")
  .onChange(controller.update);
globalFolder.add(controller,"import").name("Import *.dxf");
globalFolder.add(controller,"update").name("Update Model");

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const canvas = renderer.domElement;
document.body.appendChild(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color("white");



// camera & control

const fov = 75;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

const p_c_x=60, p_c_y=20, p_c_z=100;
camera.position.set(p_c_x, p_c_y, p_c_z);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, canvas);
controls.enablePan = true; // 是否开启右键拖拽
controls.dampingFactor = 0.5; // 动态阻尼系数 就是鼠标拖拽旋转灵敏度，阻尼越小越灵敏
controls.autoRotate = true; // 是否自动旋转
const autoRotateSpeed=5.0;
controls.autoRotateSpeed = autoRotateSpeed;

globalFolder.add(controls, "autoRotateSpeed", 0, 20).name("Rotate Speed");

// 坐标系 平面
// {
//     //系统坐标系绘制
//     const axesHelper = new THREE.AxesHelper(12);
//     scene.add(axesHelper);

//     const planeSize = 1000;

//     const loader = new THREE.TextureLoader();
//     const texture = loader.load( 'https://threejs.org/manual/examples/resources/images/checker.png' );
//     texture.wrapS = THREE.RepeatWrapping;
//     texture.wrapT = THREE.RepeatWrapping;
//     texture.magFilter = THREE.NearestFilter;
//     texture.colorSpace = THREE.SRGBColorSpace;
//     const repeats = planeSize / 2;
//     texture.repeat.set( repeats, repeats );

//     const planeGeo = new THREE.PlaneGeometry( planeSize, planeSize );
//     const planeMat = new THREE.MeshPhongMaterial( {
//         map: texture,
//         side: THREE.DoubleSide,
//     } );
//     const mesh = new THREE.Mesh( planeGeo, planeMat );
//     mesh.rotation.x = Math.PI * - .5;
//     scene.add( mesh );
// }

// 控制器
{
  class ColorGUIHelper {
    constructor(object, prop) {
      this.object = object;
      this.prop = prop;
    }
    get value() {
      return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
      this.object[this.prop].set(hexString);
    }
  }
  const color = 0xf5f5f5;
  const groundColor = 0xffe4c4;
  const intensity = 5;
  const light = new THREE.HemisphereLight(color, groundColor,intensity)

  scene.add(light)
  lightsFolder.addColor(new ColorGUIHelper(light, "color"), "value").name("Sky Color");
  lightsFolder.addColor(new ColorGUIHelper(light, "groundColor"), "value").name("Ground Color");
  lightsFolder.add(light, "intensity", 0, 100, 1).name("Intensity");
}
let obj_list = [];

const reader = new FileReader();
let dxf;
const parser = new DxfParser();


// 开场
function initText()
{
  const textLoader = new FontLoader();
  //导入字体
  textLoader.load(
    `./fonts/FuturaLT-Heavy.typeface.json`,
    font => {
      const textGeometry = new TextGeometry("HI MOTOR", {
        font,
        size: 10,
        height: 10,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5,
      })
    let material = new THREE.MeshPhongMaterial({
      color: 0xffffff * Math.random(),
      transparent: true,
      opacity: 0.8,
    });
    let model = new THREE.Mesh(textGeometry, material)
    obj_list.push(model);
    scene.add(model);
  })
}
initText()
render();

// 解析 dxf
function updateModel(content) {
  try {
    dxf = parser.parse(content);
  } catch (err) {
    return console.error(err.stack);
  }

  let entity_groups = getEntityGroups(dxf);

  obj_list.forEach((obj) => scene.remove(obj));

  let options = {
    amount: 5,
    bevelThickness: 10,
    bevelSize: 0,
    bevelSegments: 0,
    bevelEnabled: true,
    depth: 20,
    depthWrite: false,
    // curveSegments: 1,
    // steps: 5,
  };
  let z_delta = 0;
  entity_groups.forEach((group) => {
    let shape = new THREE.Shape();
    group.entities.forEach((entity) => {
      if (entity.type == "LINE") {
        shape.moveTo(entity.vertices[0]["x"], entity.vertices[0]["y"]);
        shape.lineTo(entity.vertices[1]["x"], entity.vertices[1]["y"]);
      } else if (entity.type == "ARC") {
        shape.absarc(
          entity.center["x"],
          entity.center["y"],
          entity.radius,
          entity.startAngle,
          entity.endAngle,
          entity.rotateDir
        );
      }
    });
    // let geometry = new THREE.ShapeGeometry(shape);
    let geometry = new THREE.ExtrudeGeometry(shape, options);
    let material = new THREE.MeshPhongMaterial({
      color: 0xffffff * Math.random(),
      transparent: true,
      opacity: 0.9,
    });
    let model;
    if (controller.type == "MESH"){
      model = new THREE.Mesh(geometry, material);
    }else if (controller.type == "LINE"){
      model = new THREE.LineSegments( geometry, material );
    }else if (controller.type == "POINT"){
      model = new THREE.Points( geometry, material );
    }

    model.position.z = z_delta;
    z_delta += 0.05;
    obj_list.push(model);
    scene.add(model);
  });
  render();
}

function resizeRendererToDisplaySize(renderer) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render() {
  if (resizeRendererToDisplaySize(renderer)) {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

