import {GLTFLoader} from '../lib/GLTFLoader.module.js'
import * as THREE from '../../lib/three.module.js'
export {list_library, loadModel};

function list_library(path = '../models/library/library.json'){
    // request library json file
    let json;
    let request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.send(null);
    if (request.status == 200){
        json = JSON.parse(request.responseText);
    }

    return json;
}

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