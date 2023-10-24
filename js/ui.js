import '../lib/tweakpane-3.0.5.js';
import '../lib/tweakpane-plugin-rotation.js';
import '../lib/tweakpane-plugin-file-import.js';
import {importModel} from './helpers.js';


// LEFT PANE
const leftPane = new Tweakpane.Pane();
leftPane.registerPlugin(TweakpaneFileImportPlugin);
leftPane.element.parentElement.style.top = "48px";
leftPane.element.parentElement.style.left = "8px";

const libraryPane = leftPane.addFolder({
    title: 'Library',
    expanded: true
});


const params = {
	file: '',
};

libraryPane.addInput(params, 'file', {
    view: 'file-input',
    lineCount: 2,
    filetypes: ['.glb', '.gltf'],
})
.on('change', async(ev) => {
    importModel(await ev.value.arrayBuffer());
    self
});


const includedPane = leftPane.addFolder({
    title: 'Objects',
    expanded: true});

    includedPane


//RIGHT PANE
const rightPane = new Tweakpane.Pane();
rightPane.element.parentElement.style.top = "48px";
rightPane.registerPlugin(TweakpaneRotationInputPlugin);


const transformParams = {
    position: { x: 0.0, y: 0.0, z: 0.0 },
    euler: { x: 0.0, y: 0.0, z: 0.0 },
    quat: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
}

const movePane = rightPane.addFolder({
    title: 'Move',
    expanded: true});

movePane.addInput(transformParams, 'position');

const rotatePane = rightPane.addFolder({
    title: 'Rotate',
    expanded: true});

const guiEuler = rotatePane.addInput(transformParams, 'euler', {
    view: 'rotation',
    rotationMode: 'euler',
    order: 'XYZ', // Extrinsic rotation order. optional, 'XYZ' by default
    unit: 'deg', // or 'rad' or 'turn'. optional, 'rad' by default
    expanded: true,
    picker: 'inline', // or 'popup'. optional, 'popup' by default
});

