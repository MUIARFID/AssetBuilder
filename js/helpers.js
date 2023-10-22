import {GLTFLoader} from '../lib/GLTFLoader.module.js'
import * as THREE from '../../lib/three.module.js'

function loadModel(path, scene) {
    const loaderGLTF = new GLTFLoader();
    let model;
    loaderGLTF.load(path,
        function (gltf) {
            model = gltf.scene;
            // console.log(gltf);
            for(let node of gltf.scene.children){
                for(let mesh of node.children){
                    mesh.material.metalness = 0;
                }
            }
            model.name = "asd"
            scene.add(model)
            // onLoad(scene);
        }
    );
}