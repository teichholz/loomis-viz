'use client'
import { Canvas, Euler, extend, SphereGeometryProps, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three"
import React from "react"; import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { Line, useAspect } from "@react-three/drei";
extend({ Line2 })


interface KeyBinding {
  cmd: string | string[],
  callback: () => any,
}

export const useKeybindings = (...props: KeyBinding[]) => {
  const currentlyPressedKeys = new Set();

  const areAllKeyPressed = (keys: string | string[]) => {
    for (const key of keys) {
      if (!currentlyPressedKeys.has(key)) return false;
    }
    return true;
  }

  const bindingsKeyDown = (e: KeyboardEvent) => {
    currentlyPressedKeys.add(e.key);
    props.forEach((binding) => {
      if (areAllKeyPressed(binding.cmd)) {
        binding.callback();
      }
    });

  };

  const bindingsKeyUp = (e: KeyboardEvent) => {
    currentlyPressedKeys.delete(e.key);
  }

  useEffect(() => {
    document.addEventListener("keydown", bindingsKeyDown);
    document.addEventListener("keyup", bindingsKeyUp);
    return () => {
      document.removeEventListener("keydown", bindingsKeyDown);
      document.removeEventListener("keyup", bindingsKeyUp);
    };
  }, []);
};

function lerp(v0: number, v1: number, t: number) {
  return (1 - t) * v0 + t * v1;
}

type ALineProps = {
  rotated: (num: number) => any;
  rotation: number;
  radius: number;
}

type ALineType = "Meridian" | "Equator";

function ALine(type: ALineType) {
  return (props: ALineProps) => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      props.radius + 0.01, props.radius + 0.01,
      0, 2 * Math.PI,
      false,
      0
    );

    const { camera, gl } = useThree();
    const points = curve.getPoints(150);
    const [selected, setSelected] = useState(false);
    const [hover, setHover] = useState(false);
    const [mousePos, setMousePos] = useState(new THREE.Vector3());
    const [cumulativeRotation, setCumulativeRotation] = useState(0); // Track cumulative rotation

    const mouseup = (_: MouseEvent) => {
      setSelected(false);
    };

    const mousemove = (ev: MouseEvent) => {
      if (selected) {
        const w = gl.domElement.clientWidth;
        const h = gl.domElement.clientHeight;
        const size = Math.min(w, h);

        const deltaX = mousePos.x - ev.x;
        const deltaY = mousePos.y - ev.y;

        let deltaRot;
        if (type === "Meridian") {
          deltaRot = (deltaY / size) * Math.PI;
        } else {
          deltaRot = (deltaX / size) * Math.PI;
        }

        setCumulativeRotation((prevRot) => prevRot - deltaRot);
        setMousePos(new THREE.Vector3(ev.x, ev.y, 0));
        props.rotated(cumulativeRotation - deltaRot);
      }
    };

    useEffect(() => {
      setCumulativeRotation(props.rotation);
    }, []);

    useEffect(() => {
      document.addEventListener('mouseup', mouseup);
      document.addEventListener('mousemove', mousemove);

      return () => {
        document.removeEventListener('mouseup', mouseup);
        document.removeEventListener('mousemove', mousemove);
      };
    }, [selected, mousePos, cumulativeRotation]);

    return (
      <Line
        points={points}
        color={!hover ? "black" : "blue"}
        linewidth={10}
        rotation={type === "Equator" ? [props.rotation, 0, 0] : [0, props.rotation, 0]}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onPointerDown={(ev) => {
          setSelected(true);
          setMousePos(new THREE.Vector3(ev.x, ev.y, 0));
        }}
      />
    );
  }
}

const Meridian = ALine("Meridian");
const Equator = ALine("Equator");

const visibleHeightAtZDepth = (depth: any, camera: THREE.PerspectiveCamera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = camera.fov * Math.PI / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth: any, camera: THREE.PerspectiveCamera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

function Vis() {
  const [rotationMer, setRotationMer] = useState(Math.PI / 2);
  const [rotationEq, setRotationEq] = useState(Math.PI / 2);
  const [radius, setRadius] = useState(3);
  const { gl, camera } = useThree();

  function resize() {
    const diameter = Math.min(visibleHeightAtZDepth(1.1, camera as THREE.PerspectiveCamera), visibleWidthAtZDepth(1.1, camera as THREE.PerspectiveCamera));
    const radius = diameter / 2;
    setRadius(radius);
  }

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  const smoothRotation = Math.PI / 500;
  useKeybindings({
    cmd: "d",
    callback: () => { setRotationMer(rotation => rotation + smoothRotation) }
  }, {
    cmd: "a",
    callback: () => { setRotationMer(rotation => rotation - smoothRotation) }
  }, {
    cmd: "w",
    callback: () => { setRotationEq(rotation => rotation - smoothRotation) }
  }, {
    cmd: "s",
    callback: () => { setRotationEq(rotation => rotation + smoothRotation) }
  });

  return <>
    <ambientLight intensity={Math.PI / 2} />
    <spotLight position={[10, 10, 15]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />

    {
      <mesh rotation={[rotationEq, rotationMer, 0]}>
        <sphereGeometry args={[radius, 100, 64]} />
        <meshStandardMaterial color="lightgrey" />
      </mesh>
    }

    <Equator radius={radius} rotation={rotationEq} rotated={setRotationMer} />

    <Meridian radius={radius} rotation={rotationMer} rotated={setRotationEq} />
  </>;
}

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-4/5 w-4/5">
        <Canvas className="">
          <Vis />
        </Canvas>
      </main>
    </div>
  );
}
