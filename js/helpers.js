import {GLTFLoader} from '../lib/GLTFLoader.module.js'
import * as THREE from '../../lib/three.module.js'
export {list_library, importModel};
import {modelLibrary} from './globals.js';

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

function importModel(data, name = "test_load") {
    const loaderGLTF = new GLTFLoader();
    loaderGLTF.parse(data, '',
        (gltf) => {
            let model = gltf.scene;
            // for(let node of gltf.scene.children){
            //     for(let mesh of node.children){
            //         mesh.material.metalness = 0;
            //     }
            // }
            console.log(model);
            addToModelLibrary(model, name);
            // model.name = "asd"
            // scene.add(model)
            // onLoad(scene);
        },
        (e) => {
            console.log(e);
        }
    );
}

function addToModelLibrary(model, name){
    modelLibrary[name] = model;
}   