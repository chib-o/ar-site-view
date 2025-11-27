// js/arEngine.js
/*(function (global) {
    'use strict';

    var running = false;

    var ProcureAREngine = {
        init: init,
        stop: stop
    };

    function init(canvasEl, options) {
        running = true;
        console.log('AR Engine init', canvasEl, options);

        // TODO: WebXR + Three.js initialisation using:
        // options.bundle.config, options.bundle.modelBinary

        // Example of reporting a user action:
        /*
        setTimeout(function () {
            if (!running) return;
            options.onAction && options.onAction({
                type: 'DEMO_TAP',
                siteId: options.siteId,
                floorId: options.floorId,
                assetId: 'DEMO-ASSET',
                payload: { note: 'Demo tap in AR' },
                localTimestamp: Date.now()
            });
        }, 5000);
        *
    }

    function stop() {
        running = false;
        console.log('AR Engine stopped');
        // TODO: stop animation loop, end XR session, dispose scene etc.
    }

    global.ProcureAREngine = ProcureAREngine;
})(window);*/

// js/arEngine.js
/*(function (global)*/ 


    import * as THREE from 'three';
    //import { GLTFLoader } from 'gltf';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

    /*var ProcureAREngine = {
        init: init,
        stop: stop
    };*/

    /*var running = false;
    var renderer, scene, camera, model, animationId;*/
    let running = false;
    let renderer, scene, camera, model;
    let animationId = null;

    export function init(canvas, options) {
        running = true;
        console.log('AR Engine init', canvas, options);
        
        scene = new THREE.Scene();
        scene.background = null;  // IMPORTANT → lets AR camera video show through

        // Camera – WebXR will override its matrices
        camera = new THREE.PerspectiveCamera(
            70,
            canvas.clientWidth / canvas.clientHeight,
            0.01,
            20
        );

        // WebGL renderer bound to your canvas
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true        // lets the AR camera show through
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

        // 🔴 THIS turns on WebXR support in Three.js
        renderer.xr.enabled = true;

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        hemiLight.position.set(0, 1, 0);
        scene.add(hemiLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(3, 10, 10);
        scene.add(dirLight);

        

        // --- 1. Set up Three.js renderer using your existing canvas ---
        /*renderer = new THREE.WebGLRenderer({
            canvas: canvasEl,
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio || 1);*/

        // function to match canvas size
        function resize() {
            /*var rect = canvas.getBoundingClientRect();
            var width = rect.width || window.innerWidth;
            var height = rect.height || window.innerHeight;
            renderer.setSize(width, height, false);
            if (camera) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }*/

            const rect = canvas.getBoundingClientRect();
            const width = rect.width || window.innerWidth;
            const height = rect.height || window.innerHeight;
    
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);


        loadTestModel();

        startAR();

        // --- 2. Create scene + camera + light ---
        /*scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        camera = new THREE.PerspectiveCamera(70, canvasEl.clientWidth / canvasEl.clientHeight, 0.01, 100);
        camera.position.set(0, 1.5, 3); // back a bit so we can see the model

        var hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        hemiLight.position.set(0, 1, 0);
        scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(3, 10, 10);
        scene.add(dirLight);*/


        // --- 4. Simple render loop (no WebXR yet) ---
        /*function renderLoop() {
            if (!running) return;

            if (model) {
                model.rotation.y += 0.01; // spin slowly so you can see it
            }

            renderer.render(scene, camera);
            animationId = requestAnimationFrame(renderLoop);
        }

        renderLoop();*/
    }


    function loadTestModel() {

    //Load GLB Model
    const loader = new GLTFLoader();

    // You can later switch this to use options.bundle.manifest.modelUrl
    var modelUrl = "./ar-model/mock/mock-model.glb";
    //real model
    //var modelUrl = options.bundle.manifest.modelUrl;


    /*loader.load(
        modelUrl,
        function (gltf) {
            model = gltf.scene;

            model.position.set(0, 0, -1);
            scene.add(model);

            console.log("Model loaded:", model);
        },
        undefined,
        function (error) {
            console.error("Error loading GLB:", error);
        }
        );*/
            loader.load(
        modelUrl,
        (gltf) => {
            model = gltf.scene;

            // Put it 1 meter in front of the camera
            model.position.set(0, 0, -1);

            // Reasonable default scale (tweak if huge/tiny)
            model.scale.set(0.2, 0.2, 0.2);

            // Debug: use normal material so lighting/textures can’t “hide” it
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshNormalMaterial();
                }
            });

            scene.add(model);
            console.log('Model loaded:', model);
        },
        undefined,
        (error) => {
            console.error('Error loading GLB:', error);
        }
    );
    }


    /*function stop() {
        running = false;
        console.log('AR Engine stopped');
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (renderer) {
            renderer.dispose();
        }
        // Note: you might also want to remove event listeners, dispose geometry, etc.
    }*/

    /*function startAR() {
    // This will simply reject on devices that don’t support AR
    const sessionInit = {
        requiredFeatures: ['local-floor'],   // floor-level tracking
        optionalFeatures: ['hit-test']       // only if you plan to place objects via taps
    };

    navigator.xr.requestSession('immersive-ar', sessionInit)
        .then(session => {
            renderer.xr.setSession(session);     // hook WebXR into Three.js
            renderer.setAnimationLoop(onXRFrame);
        })
        .catch(err => {
            console.error('Failed to start WebXR AR session:', err);
            // No fallback – it will just log the error and stop here
        });
    }*/

function startAR() {
    const sessionInit = {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hit-test']
    };

    if (!navigator.xr) {
        console.error('WebXR not supported on this device/browser');
        return;
    }

    navigator.xr.requestSession('immersive-ar', sessionInit)
        .then((session) => {
            renderer.xr.setSession(session);

            // Use XR animation loop – no separate requestAnimationFrame loop
            renderer.setAnimationLoop(onXRFrame);
        })
        .catch((err) => {
            console.error('Failed to start WebXR AR session:', err);
        });
}

    /*function onXRFrame(time, frame) {
        // Any per-frame logic (animations, etc.)
        renderer.render(scene, camera);
    }*/
// XR frame loop
function onXRFrame(time, frame) {
    if (!running) return;

    // Simple spin for visibility
    if (model) {
        model.rotation.y += 0.01;
    }

    // 🔑 Use XR camera (Three will manage it)
    renderer.render(scene, renderer.xr.getCamera());
}

export function stop() {
    running = false;
    console.log('AR Engine stopped');

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
    }
}

    /*export const ProcureAREngine = { init, stop };
    //export const ProcureAREngine = { init, stop };
    window.ProcureAREngine = ProcureAREngine;*/

// Export + attach to window for older code that expects window.ProcureAREngine
export const ProcureAREngine = { init, stop };
if (typeof window !== 'undefined') {
    window.ProcureAREngine = ProcureAREngine;
}



/*    global.ProcureAREngine = ProcureAREngine;
})(window);*/


