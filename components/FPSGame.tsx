"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Octree } from "three/examples/jsm/math/Octree";
import { OctreeHelper } from "three/examples/jsm/helpers/OctreeHelper";
import { Capsule } from "three/examples/jsm/math/Capsule";
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";

import styles from "./FPSGame.module.css";

const FPSGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clock and scene setup
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee);
    scene.fog = new THREE.Fog(0x88ccee, 0, 50);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.rotation.order = "YXZ";

    // Lighting
    const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
    fillLight1.position.set(2, 1, 1);
    scene.add(fillLight1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(-5, 25, -1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = -0.00006;
    scene.add(directionalLight);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    containerRef.current.appendChild(renderer.domElement);

    // Stats
    const stats = new Stats();
    stats.dom.style.position = "absolute";
    stats.dom.style.top = "0px";
    containerRef.current.appendChild(stats.dom);

    // Constants and variables
    const GRAVITY = 30;
    const NUM_SPHERES = 100;
    const SPHERE_RADIUS = 0.2;
    const STEPS_PER_FRAME = 5;

    // Sphere setup
    const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
    const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });

    const spheres: {
      mesh: THREE.Mesh;
      collider: THREE.Sphere;
      velocity: THREE.Vector3;
    }[] = [];

    // let sphereIdx = 0;

    for (let i = 0; i < NUM_SPHERES; i++) {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.castShadow = true;
      sphere.receiveShadow = true;

      scene.add(sphere);

      spheres.push({
        mesh: sphere,
        collider: new THREE.Sphere(
          new THREE.Vector3(0, -100, 0),
          SPHERE_RADIUS
        ),
        velocity: new THREE.Vector3(),
      });
    }

    // Octree for world collision
    const worldOctree = new Octree();

    // Player setup
    const playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1, 0),
      0.35
    );

    const playerVelocity = new THREE.Vector3();
    const playerDirection = new THREE.Vector3();

    let playerOnFloor = false;
    // let mouseTime = 0;

    const keyStates: { [key: string]: boolean } = {};

    // Reusable vectors
    const vector1 = new THREE.Vector3();
    const vector2 = new THREE.Vector3();
    const vector3 = new THREE.Vector3();

    // Event listeners
    const onKeyDown = (event: KeyboardEvent) => {
      keyStates[event.code] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keyStates[event.code] = false;
    };

    const onMouseDown = () => {
      if (!gameStarted) {
        setGameStarted(true);
        document.body.requestPointerLock();
      } else {
        document.body.requestPointerLock();
      }
      // mouseTime = performance.now();
    };

    const onMouseUp = () => {
      // if (document.pointerLockElement !== null) throwBall();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
      }
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    containerRef.current.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.body.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onWindowResize);

    // Game functions
    // function throwBall() {
    //   const sphere = spheres[sphereIdx];

    //   camera.getWorldDirection(playerDirection);

    //   sphere.collider.center.copy(playerCollider.end)
    //     .addScaledVector(playerDirection, playerCollider.radius * 1.5);

    //   // throw the ball with more force if we hold the button longer, and if we move forward
    //   const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));

    //   sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
    //   sphere.velocity.addScaledVector(playerVelocity, 2);

    //   sphereIdx = (sphereIdx + 1) % spheres.length;
    // }

    function playerCollisions() {
      const result = worldOctree.capsuleIntersect(playerCollider);

      playerOnFloor = false;

      if (result) {
        playerOnFloor = result.normal.y > 0;

        if (!playerOnFloor) {
          playerVelocity.addScaledVector(
            result.normal,
            -result.normal.dot(playerVelocity)
          );
        }

        if (result.depth >= 1e-10) {
          playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
      }
    }

    function updatePlayer(deltaTime: number) {
      let damping = Math.exp(-4 * deltaTime) - 1;

      if (!playerOnFloor) {
        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;
      }

      playerVelocity.addScaledVector(playerVelocity, damping);

      const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
      playerCollider.translate(deltaPosition);

      playerCollisions();

      camera.position.copy(playerCollider.end);
    }

    function playerSphereCollision(sphere: (typeof spheres)[0]) {
      const center = vector1
        .addVectors(playerCollider.start, playerCollider.end)
        .multiplyScalar(0.5);

      const sphere_center = sphere.collider.center;

      const r = playerCollider.radius + sphere.collider.radius;
      const r2 = r * r;

      // approximation: player = 3 spheres
      for (const point of [playerCollider.start, playerCollider.end, center]) {
        const d2 = point.distanceToSquared(sphere_center);

        if (d2 < r2) {
          const normal = vector1.subVectors(point, sphere_center).normalize();
          const v1 = vector2
            .copy(normal)
            .multiplyScalar(normal.dot(playerVelocity));
          const v2 = vector3
            .copy(normal)
            .multiplyScalar(normal.dot(sphere.velocity));

          playerVelocity.add(v2).sub(v1);
          sphere.velocity.add(v1).sub(v2);

          const d = (r - Math.sqrt(d2)) / 2;
          sphere_center.addScaledVector(normal, -d);
        }
      }
    }

    function spheresCollisions() {
      for (let i = 0, length = spheres.length; i < length; i++) {
        const s1 = spheres[i];

        for (let j = i + 1; j < length; j++) {
          const s2 = spheres[j];

          const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
          const r = s1.collider.radius + s2.collider.radius;
          const r2 = r * r;

          if (d2 < r2) {
            const normal = vector1
              .subVectors(s1.collider.center, s2.collider.center)
              .normalize();
            const v1 = vector2
              .copy(normal)
              .multiplyScalar(normal.dot(s1.velocity));
            const v2 = vector3
              .copy(normal)
              .multiplyScalar(normal.dot(s2.velocity));

            s1.velocity.add(v2).sub(v1);
            s2.velocity.add(v1).sub(v2);

            const d = (r - Math.sqrt(d2)) / 2;

            s1.collider.center.addScaledVector(normal, d);
            s2.collider.center.addScaledVector(normal, -d);
          }
        }
      }
    }

    function updateSpheres(deltaTime: number) {
      spheres.forEach((sphere) => {
        sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

        const result = worldOctree.sphereIntersect(sphere.collider);

        if (result) {
          sphere.velocity.addScaledVector(
            result.normal,
            -result.normal.dot(sphere.velocity) * 1.5
          );
          sphere.collider.center.add(
            result.normal.multiplyScalar(result.depth)
          );
        } else {
          sphere.velocity.y -= GRAVITY * deltaTime;
        }

        const damping = Math.exp(-1.5 * deltaTime) - 1;
        sphere.velocity.addScaledVector(sphere.velocity, damping);

        playerSphereCollision(sphere);
      });

      spheresCollisions();

      for (const sphere of spheres) {
        sphere.mesh.position.copy(sphere.collider.center);
      }
    }

    function getForwardVector() {
      camera.getWorldDirection(playerDirection);
      playerDirection.y = 0;
      playerDirection.normalize();

      return playerDirection;
    }

    function getSideVector() {
      camera.getWorldDirection(playerDirection);
      playerDirection.y = 0;
      playerDirection.normalize();
      playerDirection.cross(camera.up);

      return playerDirection;
    }

    function controls(deltaTime: number) {
      // gives a bit of air control
      const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

      if (keyStates["KeyW"]) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
      }

      if (keyStates["KeyS"]) {
        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
      }

      if (keyStates["KeyA"]) {
        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
      }

      if (keyStates["KeyD"]) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
      }

      if (playerOnFloor) {
        if (keyStates["Space"]) {
          playerVelocity.y = 15;
        }
      }
    }

    function teleportPlayerIfOob() {
      if (camera.position.y <= -25) {
        playerCollider.start.set(0, 0.35, 0);
        playerCollider.end.set(0, 1, 0);
        playerCollider.radius = 0.35;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
      }
    }

    // Load 3D model
    // const loader = new GLTFLoader();
    // loader.load("/models/gltf/collision-world.glb", (gltf) => {
    //   scene.add(gltf.scene);

    //   worldOctree.fromGraphNode(gltf.scene);

    //   gltf.scene.traverse((child) => {
    //     if ((child as THREE.Mesh).isMesh) {
    //       const mesh = child as THREE.Mesh;
    //       mesh.castShadow = true;
    //       mesh.receiveShadow = true;

    //       if (
    //         mesh.material instanceof THREE.MeshStandardMaterial &&
    //         mesh.material.map
    //       ) {
    //         mesh.material.map.anisotropy = 4;
    //       }
    //     }
    //   });

    //   const helper = new OctreeHelper(worldOctree);
    //   helper.visible = false;
    //   scene.add(helper);

    //   const gui = new GUI({ width: 200 });
    //   gui.add({ debug: false }, "debug").onChange(function (value) {
    //     helper.visible = value;
    //   });
    // });

    // Replace the GLTF loader part with this gallery creation code
    // Around line 385 in the original code, where the GLTF loader was

    // Instead of loading a model, we'll create our gallery
    // Comment out or remove the GLTF loader code
    /*
const loader = new GLTFLoader();
loader.load('/models/gltf/collision-world.glb', (gltf) => {
  scene.add(gltf.scene);
  ...
});
*/

    // Create materials
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Room dimensions
    const roomWidth = 20;
    const roomDepth = 20;
    const roomHeight = 5;
    const wallThickness = 0.2;

    // Create floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomWidth, wallThickness, roomDepth),
      floorMaterial
    );
    floor.position.set(0, -wallThickness / 2, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // Create ceiling
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(roomWidth, wallThickness, roomDepth),
      ceilingMaterial
    );
    ceiling.position.set(0, roomHeight + wallThickness / 2, 0);
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    // Create walls
    // Wall 1 - Front
    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness),
      wallMaterial
    );
    wall1.position.set(0, roomHeight / 2, roomDepth / 2);
    wall1.receiveShadow = true;
    wall1.castShadow = true;
    scene.add(wall1);

    // Wall 2 - Back
    const wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness),
      wallMaterial
    );
    wall2.position.set(0, roomHeight / 2, -roomDepth / 2);
    wall2.receiveShadow = true;
    wall2.castShadow = true;
    scene.add(wall2);

    // Wall 3 - Left
    const wall3 = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth),
      wallMaterial
    );
    wall3.position.set(-roomWidth / 2, roomHeight / 2, 0);
    wall3.receiveShadow = true;
    wall3.castShadow = true;
    scene.add(wall3);

    // Wall 4 - Right
    const wall4 = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth),
      wallMaterial
    );
    wall4.position.set(roomWidth / 2, roomHeight / 2, 0);
    wall4.receiveShadow = true;
    wall4.castShadow = true;
    scene.add(wall4);

    // Create second floor balcony
    const balconyHeight = roomHeight / 2;
    const balconyWidth = roomWidth / 2;
    const balconyDepth = roomDepth / 3;

    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(balconyWidth, wallThickness, balconyDepth),
      floorMaterial
    );
    balcony.position.set(roomWidth / 4, balconyHeight, -roomDepth / 4);
    balcony.receiveShadow = true;
    balcony.castShadow = true;
    scene.add(balcony);

    // Create railings for balcony
    const railingHeight = 1;
    const railingMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

    // Front railing
    const frontRailing = new THREE.Mesh(
      new THREE.BoxGeometry(balconyWidth, railingHeight, wallThickness / 2),
      railingMaterial
    );
    frontRailing.position.set(
      roomWidth / 4,
      balconyHeight + railingHeight / 2,
      -roomDepth / 4 + balconyDepth / 2
    );
    frontRailing.receiveShadow = true;
    frontRailing.castShadow = true;
    scene.add(frontRailing);

    // Side railing
    const sideRailing = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness / 2, railingHeight, balconyDepth),
      railingMaterial
    );
    sideRailing.position.set(
      0,
      balconyHeight + railingHeight / 2,
      -roomDepth / 4
    );
    sideRailing.receiveShadow = true;
    sideRailing.castShadow = true;
    scene.add(sideRailing);

    // Create staircase
    const stairCount = 10;
    const stairWidth = 3;
    const stairDepth = 0.8;
    const stairHeight = balconyHeight / stairCount;
    const stairs = [];

    for (let i = 0; i < stairCount; i++) {
      const stair = new THREE.Mesh(
        new THREE.BoxGeometry(stairWidth, stairHeight, stairDepth),
        floorMaterial
      );

      // Position each stair
      stair.position.set(
        0,
        stairHeight / 2 + i * stairHeight,
        -roomDepth / 4 + balconyDepth / 2 + stairDepth / 2 + i * stairDepth
      );

      stair.receiveShadow = true;
      stair.castShadow = true;
      scene.add(stair);
      stairs.push(stair);
    }

    // Add all objects to octree for collision
    const galleryGroup = new THREE.Group();
    galleryGroup.add(
      floor,
      ceiling,
      wall1,
      wall2,
      wall3,
      wall4,
      balcony,
      frontRailing,
      sideRailing
    );
    stairs.forEach((stair) => galleryGroup.add(stair));

    // Add to scene and octree
    scene.add(galleryGroup);
    worldOctree.fromGraphNode(galleryGroup);

    // Add octree helper
    const helper = new OctreeHelper(worldOctree);
    helper.visible = false;
    scene.add(helper);

    // Add GUI for debug
    const gui = new GUI({ width: 200 });
    gui.add({ debug: false }, "debug").onChange(function (value) {
      helper.visible = value;
    });

    // Set player starting position
    playerCollider.start.set(0, 1, roomDepth / 3);
    playerCollider.end.set(0, 2, roomDepth / 3);
    camera.position.copy(playerCollider.end);

    // Adjust lighting for gallery setting
    scene.background = new THREE.Color(0xf0f0f0);
    scene.fog = new THREE.Fog(0xf0f0f0, 0, 50);

    // Remove existing lights
    scene.remove(fillLight1);
    scene.remove(directionalLight);

    // Add new gallery-appropriate lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add spot lights to simulate gallery lighting
    const spotLight1 = new THREE.SpotLight(0xffffff, 1);
    spotLight1.position.set(0, roomHeight - 0.5, 0);
    spotLight1.angle = Math.PI / 4;
    spotLight1.penumbra = 0.1;
    spotLight1.decay = 2;
    spotLight1.distance = 30;
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 1024;
    spotLight1.shadow.mapSize.height = 1024;
    scene.add(spotLight1);

    // Add more spot lights as needed for better coverage
    const spotLight2 = spotLight1.clone();
    spotLight2.position.set(roomWidth / 3, roomHeight - 0.5, roomDepth / 3);
    scene.add(spotLight2);

    const spotLight3 = spotLight1.clone();
    spotLight3.position.set(-roomWidth / 3, roomHeight - 0.5, -roomDepth / 3);
    scene.add(spotLight3);

    // Animation loop
    function animate() {
      const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

      // we look for collisions in substeps to mitigate the risk of
      // an object traversing another too quickly for detection.
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        controls(deltaTime);
        updatePlayer(deltaTime);
        updateSpheres(deltaTime);
        teleportPlayerIfOob();
      }

      renderer.render(scene, camera);
      stats.update();

      requestAnimationFrame(animate);
    }

    // Start animation loop
    animate();

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("resize", onWindowResize);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.removeEventListener("mousemove", onMouseMove);

      if (containerRef.current) {
        containerRef.current.removeEventListener("mousedown", onMouseDown);

        // Remove renderer and stats from DOM
        if (containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }

        if (containerRef.current.contains(stats.dom)) {
          containerRef.current.removeChild(stats.dom);
        }
      }

      // Dispose resources
      renderer.dispose();
    };
  }, [gameStarted]);

  return (
    <div className={styles.gameContainer}>
      <div id="info" className={styles.info}>
        Octree threejs demo - basic collisions with static triangle mesh
        <br />
        MOUSE to look around and to throw balls
        <br />
        WASD to move and SPACE to jump
      </div>
      <div id="container" ref={containerRef} className={styles.container}></div>
    </div>
  );
};

export default FPSGame;
