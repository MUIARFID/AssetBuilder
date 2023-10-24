import {Pane} from '../lib/tweakpane-4.0.1.js';

const leftPane = new Pane();
leftPane.element.style.marginTop = "40px";
leftPane.element.parentElement.style.left = "8px";
// leftPane.element.style.height = "90vh";

const f1 = leftPane.addFolder({
    title: 'Modelos',
    expanded: true});

// add subfolder
const f2 = f1.addFolder({
    title: 'Robot',
    expanded: true});

const rightPane = new Pane();
rightPane.element.style.marginTop = "40px";

