'use client'
import { Canvas, extend, ThreeEvent, useThree } from "@react-three/fiber";
import { MutableRefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three"
import React from "react"; import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { CameraControls, Line, useCursor } from "@react-three/drei";
import { Plane } from "three";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { CircleHelp, Download, Menu, Minus, Plus, Slice } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { hotkey, KeySeq, useKeybindings } from "@/lib/keys";


extend({ Line2 })


/** Checks whether the first intersected object is the object that registered the event */
function intersectedFirst(ev: ThreeEvent<PointerEvent>) {
  return ev.eventObject.uuid == ev.intersections[0].object.uuid;
}


type ALineProps = {
  selected: (isSelected: boolean) => any;
  type: "Meridian" | "Equator";
  radius?: number;
  lineWidth?: number;
}


const ALine = ({ radius = 1, lineWidth = 10, type, ...rest }: ALineProps) => {
  const curve = new THREE.EllipseCurve(
    0, 0,
    radius + 0.005, radius + 0.005,
    0, 2 * Math.PI,
    false,
    0
  );

  const points = curve.getPoints(150);
  const [selected, setSelected] = useState(false);
  const [hover, setHover] = useState(false);

  const { isClipped, planes, planeDistance, planeRadius } = useClipping();

  const mouseup = (_: MouseEvent) => {
    setSelected(false);
  };
  useEffect(() => {
    document.addEventListener('mouseup', mouseup);
    return () => {
      document.removeEventListener('mouseup', mouseup);
    };
  }, [selected]);

  useEffect(() => {
    rest.selected(selected);
  }, [selected])

  return <>
    <Line
      clippingPlanes={planes}
      points={points}
      color={!hover ? "black" : "blue"}
      linewidth={lineWidth}
      rotation={type === "Equator" ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]}
      onPointerOver={(ev) => {
        setHover(intersectedFirst(ev))
      }}
      onPointerOut={(_) => setHover(false)}
      onPointerDown={(ev) => {
        if (intersectedFirst(ev)) {
          setSelected(true);
        }
      }}
    />

    {isClipped && type == "Equator" &&
      <>
        <Line
          points={[[planeDistance * 1.005, 0, -planeRadius * 1.005], [planeDistance * 1.005, 0, planeRadius * 1.005]]}
          lineWidth={lineWidth}
          color={!hover ? "black" : "blue"}
          onPointerOver={(_) => {
            setHover(true)
          }}
          onPointerOut={(_) => setHover(false)}
          onPointerDown={(_) => {
            setSelected(true);
          }}
        />
        <Line
          points={[[-planeDistance * 1.005, 0, -planeRadius * 1.005], [-planeDistance * 1.005, 0, planeRadius * 1.005]]}
          lineWidth={lineWidth}
          color={!hover ? "black" : "blue"}
          onPointerOver={(_) => {
            setHover(true)
          }}
          onPointerOut={(_) => setHover(false)}
          onPointerDown={(_) => {
            setSelected(true);
          }}
        />
      </>
    }
  </>
}

const Meridian = (props: Omit<ALineProps, 'type'>) => ALine({ ...props, type: "Meridian" });
const Equator = (props: Omit<ALineProps, 'type'>) => ALine({ ...props, type: "Equator" });

const useClipping = create(
  combine({
    isClipped: false,
    planes: [] as THREE.Plane[],
    planeDistance: 0.0,
    planeRadius: 0.0,

  }, (set) => ({
    clip: (planes: THREE.Plane[], dist: number, radius: number) => set({ isClipped: true, planes: planes, planeDistance: dist, planeRadius: radius }),
    resetClipping: () => set({ isClipped: false, planes: [], planeDistance: 0.0, planeRadius: 0.0 }),
  })),
)

type VisProps = {
  downloadFn: MutableRefObject<() => void>
}

function Vis({ downloadFn }: VisProps) {
  const { gl, scene, camera, size, viewport } = useThree();
  const scale = Math.min(viewport.height / 2 - 0.5, viewport.width / 2 - 0.5);
  const pxScale = Math.min(size.height / 2, size.width / 2);
  const sphereRef = useRef<THREE.SphereGeometry>(null!);
  const [hovered, setHovered] = useState<boolean>(false);

  const { isClipped, planes, planeDistance, planeRadius, clip, resetClipping } = useClipping();

  const { zoom, setZoom, clipping } = useUI();
  useCursor(hovered)


  useEffect(() => {
    const distance = 0.65 * scale;
    const xAxis = new THREE.Vector3(1, 0, 0);
    const nxAxis = new THREE.Vector3(-1, 0, 0);

    const left = new Plane(xAxis, distance);
    const right = new Plane(nxAxis, distance);

    // pythagorean theorem
    const rr = Math.sqrt(scale * scale - distance * distance);

    if (clipping) {
      clip([left, right], distance, rr * 1.001)
    } else {
      resetClipping();
    }
  }, [viewport, clipping]);

  const [selectedEq, setSelectedEq] = useState<boolean>(false);
  const [selectedMer, setSelectedMer] = useState<boolean>(false);
  // Just spreading the camera attributes for the "true" case leads to a bug, so I need to properly define both select / not selected states
  const [minP, setMinP] = useState(0);
  const [maxP, setMaxP] = useState(Math.PI);
  const [minA, setMinA] = useState(- Math.PI / 2);
  const [maxA, setMaxA] = useState(Math.PI / 2);

  useEffect(() => {
    if (selectedEq) {
      setMinP(Math.PI / 2);
      setMaxP(Math.PI / 2);
    } else {
      setMinP(0);
      setMaxP(Math.PI);
    }
  }, [selectedEq])

  useEffect(() => {
    if (selectedMer) {
      setMinA(0);
      setMaxA(0);
    } else {
      setMinA(-Math.PI / 2);
      setMaxA(Math.PI / 2);
    }
  }, [selectedMer])


  const cc = useRef<CameraControls>(null!);

  const onZoom = () => {
    const pos = camera.position;
    const distance = pos.length();
    const newZoom = mapRange(distance, 4, 10, 150, 90);

    setZoom(newZoom);
  };

  useEffect(() => {
    const mappedDistance = mapRange(zoom, 90, 150, 10, 4);

    // we need to makes sure, that this hook only sets the state, if the increment / decrement of the zoom comes from the ui-zoom and not by zooming via the camera controls
    // easy, since the ui-zoom always uses increments / decrements of 10 while the camera controls use very small increments / decrements
    if (Math.abs(cc.current!.distance - mappedDistance) > 0.5) {
      cc.current!.distance = mappedDistance;
    }
  }, [zoom]);

  const speed = .1;

  useKeybindings({
    cmd: ["d"],
    callback: () => { cc.current?.rotateAzimuthTo(cc.current!.azimuthAngle - speed, true); }
  }, {
    cmd: ["a"],
    callback: () => { cc.current?.rotateAzimuthTo(cc.current!.azimuthAngle + speed, true); }
  }, {
    cmd: ["w"],
    callback: () => { cc.current?.rotatePolarTo(cc.current!.polarAngle + speed, true); }
  }, {
    cmd: ["s"],
    callback: () => { cc.current?.rotatePolarTo(cc.current!.polarAngle - speed, true); }
  });

  const downloadSceneAsImage = () => {
    gl.render(scene, camera);
    const dataURL = gl.domElement.toDataURL('image/png');
    console.log("data url", dataURL);


    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'loomis.png';
    link.click();
  };
  useImperativeHandle(downloadFn, () => downloadSceneAsImage, []);

  useKeybindings({
    cmd: ["Mod", "Shift", "e"],
    callback: downloadSceneAsImage,
    mods: "callOnce"
  })

  return <>
    <ambientLight intensity={Math.PI / 2} />
    <spotLight position={[10, 10, 15]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />

    <group position={[0, 0, 0]} >
      <mesh
        onPointerMove={(ev) => {
          const { point } = ev;

          let inside = true;
          for (const plane of planes) {
            const distToPlane = plane.distanceToPoint(point)
            if (distToPlane < 0) {
              inside = false
            }
          }

          setHovered(inside);
        }}
        onPointerOut={(_) => {
          setHovered(false);
        }}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
      >
        <sphereGeometry ref={sphereRef} args={[scale, 100, 64]} />
        <meshStandardMaterial clippingPlanes={planes} color="lightgrey">
        </meshStandardMaterial>
      </mesh>

      <Equator radius={scale} lineWidth={pxScale / 80} selected={setSelectedEq} />
      <Meridian radius={scale} lineWidth={pxScale / 80} selected={setSelectedMer} />
    </group>

    {
      isClipped &&
      <>
        <mesh position={[planeDistance, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[planeRadius, 64]} />
        </mesh>
        <mesh position={[-planeDistance, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[planeRadius, 64]} />
        </mesh>
      </>
    }

    {
      // TODO use min and max distance as zoom limits and simply map them to percent values to show the user 
    }
    <CameraControls onChange={onZoom} ref={cc} minDistance={4} maxDistance={10} minPolarAngle={minP} maxPolarAngle={maxP} minAzimuthAngle={minA} maxAzimuthAngle={maxA} />
  </>;
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number = 0, outMax: number = 1): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

const startZoom = 140;
const useUI = create(
  combine(
    {
      clipping: true,

      zoom: startZoom,
      lowerLimit: 90,
      upperLimit: 150
    },
    (set) => ({
      zoomOut: () => set(({ zoom, lowerLimit }) => ({
        zoom: Math.max(startZoom - lowerLimit, zoom - (zoom % 10 || 10)),
        direction: "ui"
      })),
      zoomIn: () => set(({ zoom, upperLimit }) => ({
        zoom: Math.min(startZoom + upperLimit, zoom + (10 - zoom % 10)),
        direction: "ui"
      })),
      setZoom: (zoom: number) => set({ zoom }),
      setLowerLimit: (lowerLimit: number) => set({ lowerLimit }),
      setUpperLimit: (upperLimit: number) => set({ upperLimit }),
      toggleClipping: () => set(({ clipping }) => ({ clipping: !clipping })),
      reset: () => set({ zoom: startZoom }),
    })
  )
);


export default function Home() {
  const { zoom, upperLimit, lowerLimit, zoomIn, zoomOut, reset, toggleClipping } = useUI()
  const downloadFn = useRef<() => void>(null!);

  useKeybindings({
    cmd: ["Mod", "c"],
    callback: toggleClipping,
  });

  const keybinds: { keys: KeySeq, description: string }[] = [
    { keys: ["Mod", "c"], description: "Toggle cranium clipping" },
    { keys: ["Mod", "Shift", "e"], description: "Export image" },
  ];

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex w-full">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Menu />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => downloadFn.current()}>
                <Download /><span>Download</span>
                <DropdownMenuShortcut>{hotkey(keybinds[0].keys)}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={toggleClipping}>
                <Slice /> Cranium Clipping
                <DropdownMenuShortcut>{hotkey(keybinds[1].keys)}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-4/5 w-4/5">
        <Canvas gl={{ localClippingEnabled: true }} camera={{ fov: 60 }} className="">
          <Vis downloadFn={downloadFn} />
        </Canvas>
      </main>

      <div className="flex w-full justify-between">
        <div>
          <Button variant="outline" onClick={zoomOut} disabled={zoom <= lowerLimit}>
            <Minus />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger onClick={reset}>
                <span className="p-2">{Math.round(zoom - 40)}%</span>
              </TooltipTrigger>
              <TooltipContent>
                Reset Zoom
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" onClick={zoomIn} disabled={zoom >= upperLimit}>
            <Plus />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <CircleHelp className="w-6 h-6" />
          </PopoverTrigger>
          <PopoverContent side="top">
            <div className="space-y-2">
              {keybinds.map(({ keys, description }, index) => (
                <React.Fragment key={index}>
                  <div key={index} className="flex justify-between">
                    <div>{description}</div>
                    <div className="opacity-60 text-right">{hotkey(keys)}</div>
                  </div>
                  {index < keybinds.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div >
  );
}
