import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { DxfParser } from "dxf-parser";

import { getEntityGroups } from "./entity-group";

// 添加按钮点击事件的监听器
const importButton = document.getElementById("importButton");
importButton.addEventListener("click", function () {
  let fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".dxf"; // 只接受文本文件，可以根据需要更改
  fileInput.addEventListener("change", importFile);
  fileInput.click();
});

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("white");

const fov = 75;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

camera.position.set(60, 20, 100);
camera.lookAt(0, 0, 0);

const canvas = renderer.domElement;
const controls = new OrbitControls(camera, canvas);

controls.enablePan = true; // 是否开启右键拖拽
controls.dampingFactor = 0.5; // 动态阻尼系数 就是鼠标拖拽旋转灵敏度，阻尼越小越灵敏

controls.enableRotate = true;
controls.autoRotate = true; // 是否自动旋转
controls.autoRotateSpeed = 8.0;
controls.rotateSpeed = 2.0;

controls.target.set(0, 5, 0);
controls.update();

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
  class DegRadHelper {
    constructor(obj, prop) {
      this.obj = obj;
      this.prop = prop;
    }
    get value() {
      return THREE.MathUtils.radToDeg(this.obj[this.prop]);
    }
    set value(v) {
      this.obj[this.prop] = THREE.MathUtils.degToRad(v);
    }
  }
  function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name);
    folder.add(vector3, "x", -100, 100).onChange(onChangeFn);
    folder.add(vector3, "y", 0, 1000).onChange(onChangeFn);
    folder.add(vector3, "z", -100, 100).onChange(onChangeFn);
    folder.open();
  }

  const color = 0xffffff;
  const intensity = 10000;
  const light = new THREE.SpotLight(color, intensity);
  light.position.set(0, 100, 40);
  light.target.position.set(0, 0, 0);
  scene.add(light);
  scene.add(light.target);

  function updateLight() {
    light.target.updateMatrixWorld();
  }

  updateLight();

  const gui = new GUI();
  gui.addColor(new ColorGUIHelper(light, "color"), "value").name("color");

  gui.add(light, "intensity", 0, 10000, 1);
  gui.add(light, "distance", 0, 1000).onChange(updateLight);
  gui
    .add(new DegRadHelper(light, "angle"), "value", 0, 90)
    .name("angle")
    .onChange(updateLight);
  gui.add(light, "penumbra", 0, 1, 0.01);

  makeXYZGUI(gui, light.position, "position", updateLight);
  makeXYZGUI(gui, light.target.position, "target", updateLight);
}
let obj_list = [];

const reader = new FileReader();
let dxf;
const parser = new DxfParser();


// 开场
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
render();

// const defaultURL = './models/fluid.dxf';
// fetch(defaultURL)
//     .then(response => response.text())
//     .then(content => {
//         updateModel(content)
//     })
//     .catch(error => {
//         console.error('加载默认URL时发生错误：', error);
//     });

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
    depth: 5,
    depthWrite: false,
    // curveSegments: 1,
    // steps: 5,
  };
  let z_delta = 0.05;
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
      opacity: 0.6,
    });
    let model = new THREE.Mesh(geometry, material);
    // let model = new THREE.LineSegments( geometry, material );
    // let model = new THREE.Points( geometry, material );
    model.position.z = z_delta;
    z_delta += z_delta;
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

// 导入文件的函数
function importFile(event) {
  const file = event.target.files[0];
  reader.onload = function (e) {
    const contents = e.target.result;
    // 在这里处理导入文件的逻辑
    updateModel(contents);
  };

  reader.readAsText(file);
}
