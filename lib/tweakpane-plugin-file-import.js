(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TweakpaneFileImportPlugin = {}));
})(this, (function (exports) { 'use strict';

    function forceCast(v) {
        return v;
    }

    class Emitter {
        constructor() {
            this.observers_ = {};
        }
        on(eventName, handler) {
            let observers = this.observers_[eventName];
            if (!observers) {
                observers = this.observers_[eventName] = [];
            }
            observers.push({
                handler: handler,
            });
            return this;
        }
        off(eventName, handler) {
            const observers = this.observers_[eventName];
            if (observers) {
                this.observers_[eventName] = observers.filter((observer) => {
                    return observer.handler !== handler;
                });
            }
            return this;
        }
        emit(eventName, event) {
            const observers = this.observers_[eventName];
            if (!observers) {
                return;
            }
            observers.forEach((observer) => {
                observer.handler(event);
            });
        }
    }

    const PREFIX = 'tp';
    function ClassName(viewName) {
        const fn = (opt_elementName, opt_modifier) => {
            return [
                PREFIX,
                '-',
                viewName,
                'v',
                opt_elementName ? `_${opt_elementName}` : '',
                opt_modifier ? `-${opt_modifier}` : '',
            ].join('');
        };
        return fn;
    }

    function parseObject(value, keyToParserMap) {
        const keys = Object.keys(keyToParserMap);
        const result = keys.reduce((tmp, key) => {
            if (tmp === undefined) {
                return undefined;
            }
            const parser = keyToParserMap[key];
            const result = parser(value[key]);
            return result.succeeded
                ? Object.assign(Object.assign({}, tmp), { [key]: result.value }) : undefined;
        }, {});
        return forceCast(result);
    }
    function parseArray(value, parseItem) {
        return value.reduce((tmp, item) => {
            if (tmp === undefined) {
                return undefined;
            }
            const result = parseItem(item);
            if (!result.succeeded || result.value === undefined) {
                return undefined;
            }
            return [...tmp, result.value];
        }, []);
    }
    function isObject(value) {
        if (value === null) {
            return false;
        }
        return typeof value === 'object';
    }
    function createParamsParserBuilder(parse) {
        return (optional) => (v) => {
            if (!optional && v === undefined) {
                return {
                    succeeded: false,
                    value: undefined,
                };
            }
            if (optional && v === undefined) {
                return {
                    succeeded: true,
                    value: undefined,
                };
            }
            const result = parse(v);
            return result !== undefined
                ? {
                    succeeded: true,
                    value: result,
                }
                : {
                    succeeded: false,
                    value: undefined,
                };
        };
    }
    function createParamsParserBuilders(optional) {
        return {
            custom: (parse) => createParamsParserBuilder(parse)(optional),
            boolean: createParamsParserBuilder((v) => typeof v === 'boolean' ? v : undefined)(optional),
            number: createParamsParserBuilder((v) => typeof v === 'number' ? v : undefined)(optional),
            string: createParamsParserBuilder((v) => typeof v === 'string' ? v : undefined)(optional),
            function: createParamsParserBuilder((v) =>
            typeof v === 'function' ? v : undefined)(optional),
            constant: (value) => createParamsParserBuilder((v) => (v === value ? value : undefined))(optional),
            raw: createParamsParserBuilder((v) => v)(optional),
            object: (keyToParserMap) => createParamsParserBuilder((v) => {
                if (!isObject(v)) {
                    return undefined;
                }
                return parseObject(v, keyToParserMap);
            })(optional),
            array: (itemParser) => createParamsParserBuilder((v) => {
                if (!Array.isArray(v)) {
                    return undefined;
                }
                return parseArray(v, itemParser);
            })(optional),
        };
    }
    const ParamsParsers = {
        optional: createParamsParserBuilders(true),
        required: createParamsParserBuilders(false),
    };
    function parseParams(value, keyToParserMap) {
        const result = ParamsParsers.required.object(keyToParserMap)(value);
        return result.succeeded ? result.value : undefined;
    }

    class CompositeConstraint {
        constructor(constraints) {
            this.constraints = constraints;
        }
        constrain(value) {
            return this.constraints.reduce((result, c) => {
                return c.constrain(result);
            }, value);
        }
    }

    function createNumberFormatter(digits) {
        return (value) => {
            return value.toFixed(Math.max(Math.min(digits, 20), 0));
        };
    }

    const innerFormatter = createNumberFormatter(0);
    function formatPercentage(value) {
        return innerFormatter(value) + '%';
    }

    function computeOffset(ev, elem) {
        var _a, _b;
        const win = elem.ownerDocument.defaultView;
        const rect = elem.getBoundingClientRect();
        return {
            x: ev.pageX - (((_a = (win && win.scrollX)) !== null && _a !== void 0 ? _a : 0) + rect.left),
            y: ev.pageY - (((_b = (win && win.scrollY)) !== null && _b !== void 0 ? _b : 0) + rect.top),
        };
    }
    class PointerHandler {
        constructor(element) {
            this.lastTouch_ = null;
            this.onDocumentMouseMove_ = this.onDocumentMouseMove_.bind(this);
            this.onDocumentMouseUp_ = this.onDocumentMouseUp_.bind(this);
            this.onMouseDown_ = this.onMouseDown_.bind(this);
            this.onTouchEnd_ = this.onTouchEnd_.bind(this);
            this.onTouchMove_ = this.onTouchMove_.bind(this);
            this.onTouchStart_ = this.onTouchStart_.bind(this);
            this.elem_ = element;
            this.emitter = new Emitter();
            element.addEventListener('touchstart', this.onTouchStart_, {
                passive: false,
            });
            element.addEventListener('touchmove', this.onTouchMove_, {
                passive: true,
            });
            element.addEventListener('touchend', this.onTouchEnd_);
            element.addEventListener('mousedown', this.onMouseDown_);
        }
        computePosition_(offset) {
            const rect = this.elem_.getBoundingClientRect();
            return {
                bounds: {
                    width: rect.width,
                    height: rect.height,
                },
                point: offset
                    ? {
                        x: offset.x,
                        y: offset.y,
                    }
                    : null,
            };
        }
        onMouseDown_(ev) {
            var _a;
            ev.preventDefault();
            (_a = ev.currentTarget) === null || _a === void 0 ? void 0 : _a.focus();
            const doc = this.elem_.ownerDocument;
            doc.addEventListener('mousemove', this.onDocumentMouseMove_);
            doc.addEventListener('mouseup', this.onDocumentMouseUp_);
            this.emitter.emit('down', {
                altKey: ev.altKey,
                data: this.computePosition_(computeOffset(ev, this.elem_)),
                sender: this,
                shiftKey: ev.shiftKey,
            });
        }
        onDocumentMouseMove_(ev) {
            this.emitter.emit('move', {
                altKey: ev.altKey,
                data: this.computePosition_(computeOffset(ev, this.elem_)),
                sender: this,
                shiftKey: ev.shiftKey,
            });
        }
        onDocumentMouseUp_(ev) {
            const doc = this.elem_.ownerDocument;
            doc.removeEventListener('mousemove', this.onDocumentMouseMove_);
            doc.removeEventListener('mouseup', this.onDocumentMouseUp_);
            this.emitter.emit('up', {
                altKey: ev.altKey,
                data: this.computePosition_(computeOffset(ev, this.elem_)),
                sender: this,
                shiftKey: ev.shiftKey,
            });
        }
        onTouchStart_(ev) {
            ev.preventDefault();
            const touch = ev.targetTouches.item(0);
            const rect = this.elem_.getBoundingClientRect();
            this.emitter.emit('down', {
                altKey: ev.altKey,
                data: this.computePosition_(touch
                    ? {
                        x: touch.clientX - rect.left,
                        y: touch.clientY - rect.top,
                    }
                    : undefined),
                sender: this,
                shiftKey: ev.shiftKey,
            });
            this.lastTouch_ = touch;
        }
        onTouchMove_(ev) {
            const touch = ev.targetTouches.item(0);
            const rect = this.elem_.getBoundingClientRect();
            this.emitter.emit('move', {
                altKey: ev.altKey,
                data: this.computePosition_(touch
                    ? {
                        x: touch.clientX - rect.left,
                        y: touch.clientY - rect.top,
                    }
                    : undefined),
                sender: this,
                shiftKey: ev.shiftKey,
            });
            this.lastTouch_ = touch;
        }
        onTouchEnd_(ev) {
            var _a;
            const touch = (_a = ev.targetTouches.item(0)) !== null && _a !== void 0 ? _a : this.lastTouch_;
            const rect = this.elem_.getBoundingClientRect();
            this.emitter.emit('up', {
                altKey: ev.altKey,
                data: this.computePosition_(touch
                    ? {
                        x: touch.clientX - rect.left,
                        y: touch.clientY - rect.top,
                    }
                    : undefined),
                sender: this,
                shiftKey: ev.shiftKey,
            });
        }
    }

    function constrainRange(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function removeAlphaComponent(comps) {
        return [comps[0], comps[1], comps[2]];
    }

    function zerofill(comp) {
        const hex = constrainRange(Math.floor(comp), 0, 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    }
    function colorToHexRgbString(value, prefix = '#') {
        const hexes = removeAlphaComponent(value.getComponents('rgb'))
            .map(zerofill)
            .join('');
        return `${prefix}${hexes}`;
    }
    function colorToHexRgbaString(value, prefix = '#') {
        const rgbaComps = value.getComponents('rgb');
        const hexes = [rgbaComps[0], rgbaComps[1], rgbaComps[2], rgbaComps[3] * 255]
            .map(zerofill)
            .join('');
        return `${prefix}${hexes}`;
    }
    function colorToFunctionalRgbString(value, opt_type) {
        const formatter = createNumberFormatter(opt_type === 'float' ? 2 : 0);
        const comps = removeAlphaComponent(value.getComponents('rgb', opt_type)).map((comp) => formatter(comp));
        return `rgb(${comps.join(', ')})`;
    }
    function createFunctionalRgbColorFormatter(type) {
        return (value) => {
            return colorToFunctionalRgbString(value, type);
        };
    }
    function colorToFunctionalRgbaString(value, opt_type) {
        const aFormatter = createNumberFormatter(2);
        const rgbFormatter = createNumberFormatter(opt_type === 'float' ? 2 : 0);
        const comps = value.getComponents('rgb', opt_type).map((comp, index) => {
            const formatter = index === 3 ? aFormatter : rgbFormatter;
            return formatter(comp);
        });
        return `rgba(${comps.join(', ')})`;
    }
    function createFunctionalRgbaColorFormatter(type) {
        return (value) => {
            return colorToFunctionalRgbaString(value, type);
        };
    }
    function colorToFunctionalHslString(value) {
        const formatters = [
            createNumberFormatter(0),
            formatPercentage,
            formatPercentage,
        ];
        const comps = removeAlphaComponent(value.getComponents('hsl')).map((comp, index) => formatters[index](comp));
        return `hsl(${comps.join(', ')})`;
    }
    function colorToFunctionalHslaString(value) {
        const formatters = [
            createNumberFormatter(0),
            formatPercentage,
            formatPercentage,
            createNumberFormatter(2),
        ];
        const comps = value
            .getComponents('hsl')
            .map((comp, index) => formatters[index](comp));
        return `hsla(${comps.join(', ')})`;
    }
    function colorToObjectRgbString(value, type) {
        const formatter = createNumberFormatter(type === 'float' ? 2 : 0);
        const names = ['r', 'g', 'b'];
        const comps = removeAlphaComponent(value.getComponents('rgb', type)).map((comp, index) => `${names[index]}: ${formatter(comp)}`);
        return `{${comps.join(', ')}}`;
    }
    function createObjectRgbColorFormatter(type) {
        return (value) => colorToObjectRgbString(value, type);
    }
    function colorToObjectRgbaString(value, type) {
        const aFormatter = createNumberFormatter(2);
        const rgbFormatter = createNumberFormatter(type === 'float' ? 2 : 0);
        const names = ['r', 'g', 'b', 'a'];
        const comps = value.getComponents('rgb', type).map((comp, index) => {
            const formatter = index === 3 ? aFormatter : rgbFormatter;
            return `${names[index]}: ${formatter(comp)}`;
        });
        return `{${comps.join(', ')}}`;
    }
    function createObjectRgbaColorFormatter(type) {
        return (value) => colorToObjectRgbaString(value, type);
    }
    [
        {
            format: {
                alpha: false,
                mode: 'rgb',
                notation: 'hex',
                type: 'int',
            },
            stringifier: colorToHexRgbString,
        },
        {
            format: {
                alpha: true,
                mode: 'rgb',
                notation: 'hex',
                type: 'int',
            },
            stringifier: colorToHexRgbaString,
        },
        {
            format: {
                alpha: false,
                mode: 'hsl',
                notation: 'func',
                type: 'int',
            },
            stringifier: colorToFunctionalHslString,
        },
        {
            format: {
                alpha: true,
                mode: 'hsl',
                notation: 'func',
                type: 'int',
            },
            stringifier: colorToFunctionalHslaString,
        },
        ...['int', 'float'].reduce((prev, type) => {
            return [
                ...prev,
                {
                    format: {
                        alpha: false,
                        mode: 'rgb',
                        notation: 'func',
                        type: type,
                    },
                    stringifier: createFunctionalRgbColorFormatter(type),
                },
                {
                    format: {
                        alpha: true,
                        mode: 'rgb',
                        notation: 'func',
                        type: type,
                    },
                    stringifier: createFunctionalRgbaColorFormatter(type),
                },
                {
                    format: {
                        alpha: false,
                        mode: 'rgb',
                        notation: 'object',
                        type: type,
                    },
                    stringifier: createObjectRgbColorFormatter(type),
                },
                {
                    format: {
                        alpha: true,
                        mode: 'rgb',
                        notation: 'object',
                        type: type,
                    },
                    stringifier: createObjectRgbaColorFormatter(type),
                },
            ];
        }, []),
    ];

    // Create a class name generator from the view name
    // ClassName('tmp') will generate a CSS class name like `tp-tmpv`
    const containerClassName = ClassName('ctn');
    const buttonClassName = ClassName('btn');
    class FilePluginView {
        constructor(doc, config) {
            // Binding event handlers
            this.onDrop_ = this.onDrop_.bind(this);
            // DOM --------------------------
            this.element = doc.createElement('div');
            // Create container and children
            this.container = doc.createElement('div');
            this.container.style.height = `calc(var(--bld-us) * ${config.lineCount})`;
            this.container.classList.add(containerClassName());
            this.element.appendChild(this.container);
            this.fileIconEl_ = doc.createElement('div');
            this.fileIconEl_.classList.add(containerClassName('icon'));
            this.container.appendChild(this.fileIconEl_);
            this.textEl_ = doc.createElement('span');
            this.textEl_.classList.add(containerClassName('text'));
            // Create button
            this.button = doc.createElement('button');
            this.button.classList.add(buttonClassName('b'));
            this.button.innerHTML = 'Delete';
            this.button.style.display = 'none';
            this.element.appendChild(this.button);
            // Add drag and drop event handlers
            this.element.addEventListener('drop', this.onDrop_);
            this.element.addEventListener('dragover', this.onDragOver_);
            // Events ------------------------
            // Receive the bound value from the controller
            this.value_ = config.value;
            // Handle 'change' event of the value
            this.value_.emitter.on('change', this.onValueChange_.bind(this));
            // Bind view props to the element
            config.viewProps.bindClassModifiers(this.element);
            // View dispose handler
            config.viewProps.handleDispose(() => {
                // Called when the view is disposing
                console.log('TODO: dispose view');
            });
        }
        /**
         * Called when a `dragover` event is created.
         * It simply prevents files being opened when these events are occuring.
         * @param ev Drag event object.
         */
        onDragOver_(ev) {
            ev.preventDefault();
        }
        /**
         * Called whenever a `drop` event is created.
         * It changes the `rawValue` of the controller with the file that was dropped.
         * @param ev Event object.
         */
        onDrop_(ev) {
            if (ev instanceof DragEvent) {
                // Prevent default behavior (Prevent file from being opened)
                ev.preventDefault();
                if (ev.dataTransfer) {
                    if (ev.dataTransfer.files) {
                        // We only change the value if the user has dropped a single file
                        const filesArray = [ev.dataTransfer.files][0];
                        if (filesArray.length == 1) {
                            const file = filesArray.item(0);
                            this.value_.setRawValue(file);
                        }
                    }
                }
            }
        }
        /**
         * Called when the value (bound to the controller) changes (e.g. when the file is selected).
         */
        onValueChange_() {
            const fileObj = this.value_.rawValue;
            if (fileObj) {
                // Setting the text of the file to the element
                this.textEl_.textContent = fileObj.name;
                // Removing icon and adding text
                this.container.appendChild(this.textEl_);
                if (this.container.contains(this.fileIconEl_)) {
                    this.container.removeChild(this.fileIconEl_);
                }
                // Adding button to delete
                this.button.style.display = 'block';
                this.container.style.border = 'unset';
            }
            else {
                // Setting the text of the file to the element
                this.textEl_.textContent = '';
                // Removing text and adding icon
                this.container.appendChild(this.fileIconEl_);
                this.container.removeChild(this.textEl_);
                this.button.style.display = 'none';
                this.container.style.border = '1px dashed #717070';
            }
        }
    }

    class FilePluginController {
        constructor(doc, config) {
            // Binding click event handlers
            this.onContainerClick_ = this.onContainerClick_.bind(this);
            this.onButtonClick_ = this.onButtonClick_.bind(this);
            // Receive the bound value from the plugin
            this.value = config.value;
            // Get filetypes
            this.filetypes = config.filetypes;
            // and also view props
            this.viewProps = config.viewProps;
            this.viewProps.handleDispose(() => {
                // Called when the controller is disposing
            });
            // Create a custom view
            this.view = new FilePluginView(doc, {
                value: this.value,
                viewProps: this.viewProps,
                lineCount: config.lineCount,
            });
            // You can use `PointerHandler` to handle pointer events in the same way as Tweakpane do
            const containerPtHandler = new PointerHandler(this.view.container);
            containerPtHandler.emitter.on('down', this.onContainerClick_);
            const buttonPtHandler = new PointerHandler(this.view.button);
            buttonPtHandler.emitter.on('down', this.onButtonClick_);
        }
        /**
         * Event handler when the container HTML element is clicked.
         * It checks if the filetype is valid and if the user has chosen a file.
         * If the file is valid, the `rawValue` of the controller is set.
         * @param ev Pointer event.
         */
        onContainerClick_(_ev) {
            // Accepted filetypes
            const filetypes = this.filetypes;
            // Creates hidden `input` and mimicks click to open file explorer
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.style.opacity = '0';
            input.style.position = 'fixed';
            input.style.pointerEvents = 'none';
            document.body.appendChild(input);
            // Adds event listener when user chooses file
            input.addEventListener('input', (_ev) => {
                var _a;
                // Check if user has chosen a file
                if (input.files && input.files.length > 0) {
                    const file = input.files[0];
                    const fileExtension = '.' + ((_a = file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase());
                    // Check if filetype is allowed
                    if (filetypes &&
                        filetypes.length > 0 &&
                        !filetypes.includes(fileExtension) &&
                        fileExtension) {
                        return;
                    }
                    else {
                        this.value.setRawValue(file);
                    }
                }
            }, { once: true });
            // Click hidden input to open file explorer and remove it
            input.click();
            document.body.removeChild(input);
        }
        /**
         * Event handler when the delete HTML button is clicked.
         * It resets the `rawValue` of the controller.
         * @param ev Pointer event.
         */
        onButtonClick_(_ev) {
            const file = this.value.rawValue;
            if (file) {
                this.value.setRawValue(null);
            }
        }
    }

    const TweakpaneFileInputPlugin = {
        id: 'file-input',
        // type: The plugin type.
        type: 'input',
        // This plugin template injects a compiled CSS by @rollup/plugin-replace
        // See rollup.config.js for details
        css: '.tp-ctnv{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:rgba(0,0,0,0);border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0}.tp-ctnv{background-color:var(--in-bg);border-radius:var(--elm-br);box-sizing:border-box;color:var(--in-fg);font-family:inherit;height:var(--bld-us);line-height:var(--bld-us);min-width:0;width:100%}.tp-ctnv:hover{background-color:var(--in-bg-h)}.tp-ctnv:focus{background-color:var(--in-bg-f)}.tp-ctnv:active{background-color:var(--in-bg-a)}.tp-ctnv:disabled{opacity:.5}.tp-ctnv{cursor:pointer;display:flex;justify-content:center;align-items:center;overflow:hidden;position:relative;border:1px dashed #717070;border-radius:5px}.tp-ctnv.tp-v-disabled{opacity:.5}.tp-ctnv_text{color:var(--in-fg);bottom:2px;display:inline-block;font-size:.9em;height:-moz-max-content;height:max-content;line-height:.9;margin:.2rem;max-height:100%;max-width:100%;opacity:.5;position:absolute;right:2px;text-align:right;white-space:normal;width:-moz-max-content;width:max-content;word-wrap:break-word}.tp-ctnv_frac{background-color:var(--in-fg);border-radius:1px;height:2px;left:50%;margin-top:-1px;position:absolute;top:50%}.tp-ctnv_icon{box-sizing:border-box;position:relative;display:block;transform:scale(var(--ggs, 1));width:16px;height:6px;border:2px solid;border-top:0;border-bottom-left-radius:2px;border-bottom-right-radius:2px;margin-top:8px;opacity:.5}.tp-ctnv_icon::after{content:"";display:block;box-sizing:border-box;position:absolute;width:8px;height:8px;border-left:2px solid;border-top:2px solid;transform:rotate(45deg);left:2px;bottom:4px}.tp-ctnv_icon::before{content:"";display:block;box-sizing:border-box;position:absolute;border-radius:3px;width:2px;height:10px;background:currentColor;left:5px;bottom:3px}.tp-btnv_b{margin-top:10px}',
        accept(exValue, params) {
            if (typeof exValue !== 'string') {
                // Return null to deny the user input
                return null;
            }
            // Parse parameters object
            const p = ParamsParsers;
            const result = parseParams(params, {
                // `view` option may be useful to provide a custom control for primitive values
                view: p.required.constant('file-input'),
                lineCount: p.optional.number,
                filetypes: p.optional.array(p.required.string),
            });
            if (!result) {
                return null;
            }
            // Return a typed value and params to accept the user input
            return {
                initialValue: exValue,
                params: result,
            };
        },
        binding: {
            reader(_args) {
                return (exValue) => {
                    // Convert an external unknown value into the internal value
                    return exValue instanceof File ? exValue : null;
                };
            },
            constraint(_args) {
                return new CompositeConstraint([]);
            },
            writer(_args) {
                return (target, inValue) => {
                    // Use `target.write()` to write the primitive value to the target,
                    // or `target.writeProperty()` to write a property of the target
                    target.write(inValue);
                };
            },
        },
        controller(args) {
            var _a;
            const defaultNumberOfLines = 3;
            // Create a controller for the plugin
            return new FilePluginController(args.document, {
                value: args.value,
                viewProps: args.viewProps,
                lineCount: (_a = args.params.lineCount) !== null && _a !== void 0 ? _a : defaultNumberOfLines,
                filetypes: args.params.filetypes,
            });
        },
    };

    // Export your plugin(s) as constant `plugins`
    const plugins = [TweakpaneFileInputPlugin];

    exports.plugins = plugins;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
