'use client';

import { useEffect, useRef } from 'react';

export default function HeroShaderBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    async function init() {
      const THREE = await import('three');
      if (cancelled || !container) return;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2('#000000', 0.012);
      scene.background = new THREE.Color('#060D16');

      const w = container.clientWidth;
      const h = container.clientHeight;
      const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';

      // Config — brand-colored wave pins
      const params = {
        gap: 1.11,
        speed: 0.0033,
        waveHeight: 0.60,
        frequencyX: 0.27,
        frequencyZ: 0.52,
        chaosScale: 2.30,
        dotSize: 0.20,
        dotOpacity: 0.99,
        lineLength: 6.24,
        lineOpacity: 0.22,
        lineGrowth: true,
        colorStart: '#0091D5',  // GIO4X blue
        colorEnd: '#009B4D',    // GIO4X green
        camX: 14.4,
        camY: 1.0,
        camZ: 37.9,
      };

      camera.position.set(params.camX, params.camY, params.camZ);
      camera.lookAt(0, 0, 0);

      const ROWS = 50;
      const COLS = 100;

      function createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        return new THREE.CanvasTexture(canvas);
      }

      const particleCount = ROWS * COLS;
      const particlesGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const linesGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(particleCount * 2 * 3);
      const lineColors = new Float32Array(particleCount * 2 * 3);

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
      linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      linesGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

      // Layout
      const offsetX = (COLS * params.gap) / 2;
      const offsetZ = (ROWS * params.gap) / 2;
      let idx = 0;
      let lineIdx = 0;
      for (let x = 0; x < COLS; x++) {
        for (let z = 0; z < ROWS; z++) {
          const px = x * params.gap - offsetX;
          const pz = z * params.gap - offsetZ;
          particlePositions[idx * 3] = px;
          particlePositions[idx * 3 + 2] = pz;
          linePositions[lineIdx * 3] = px;
          linePositions[lineIdx * 3 + 2] = pz;
          linePositions[(lineIdx + 1) * 3] = px;
          linePositions[(lineIdx + 1) * 3 + 2] = pz;
          idx++;
          lineIdx += 2;
        }
      }

      // Gradient colors
      const c1 = new THREE.Color(params.colorStart);
      const c2 = new THREE.Color(params.colorEnd);
      let j = 0;
      let l = 0;
      for (let x = 0; x < COLS; x++) {
        const mixRatio = x / COLS;
        const mixed = c1.clone().lerp(c2, mixRatio);
        for (let z = 0; z < ROWS; z++) {
          particleColors[j * 3] = mixed.r;
          particleColors[j * 3 + 1] = mixed.g;
          particleColors[j * 3 + 2] = mixed.b;
          lineColors[l * 3] = mixed.r;
          lineColors[l * 3 + 1] = mixed.g;
          lineColors[l * 3 + 2] = mixed.b;
          lineColors[(l + 1) * 3] = mixed.r * 0.3;
          lineColors[(l + 1) * 3 + 1] = mixed.g * 0.3;
          lineColors[(l + 1) * 3 + 2] = mixed.b * 0.3;
          j++;
          l += 2;
        }
      }
      particlesGeometry.attributes.color.needsUpdate = true;
      linesGeometry.attributes.color.needsUpdate = true;

      // Materials
      const particlesMaterial = new THREE.PointsMaterial({
        size: params.dotSize,
        map: createCircleTexture(),
        vertexColors: true,
        transparent: true,
        opacity: params.dotOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const linesMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: params.lineOpacity,
        blending: THREE.AdditiveBlending,
      });

      scene.add(new THREE.Points(particlesGeometry, particlesMaterial));
      scene.add(new THREE.LineSegments(linesGeometry, linesMaterial));

      // Mouse interactivity — tilt camera on mouse move
      let mouseX = 0;
      let mouseY = 0;
      const onMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouseMove);

      // Animation
      let time = 0;
      let animId = 0;
      const floorLevel = -5.0;

      function animate() {
        if (cancelled) return;
        animId = requestAnimationFrame(animate);
        time += params.speed;

        const pPos = particlesGeometry.attributes.position.array as Float32Array;
        const lPos = linesGeometry.attributes.position.array as Float32Array;

        let i = 0;
        let li = 0;
        for (let x = 0; x < COLS; x++) {
          for (let z = 0; z < ROWS; z++) {
            const px = pPos[i * 3];
            const pz = pPos[i * 3 + 2];
            const py =
              Math.sin(px * params.frequencyX + time) * params.waveHeight +
              Math.cos(pz * params.frequencyZ + time * 0.5) * params.waveHeight +
              Math.sin((px + pz) * 0.1 + time) * params.chaosScale;

            pPos[i * 3 + 1] = py;
            lPos[li * 3 + 1] = py;
            lPos[(li + 1) * 3 + 1] = floorLevel;

            i++;
            li += 2;
          }
        }

        particlesGeometry.attributes.position.needsUpdate = true;
        linesGeometry.attributes.position.needsUpdate = true;

        // Smooth camera follow mouse
        camera.position.x += (params.camX + mouseX * 8 - camera.position.x) * 0.02;
        camera.position.y += (params.camY + mouseY * 4 - camera.position.y) * 0.02;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      }

      animate();

      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      cleanupRef.current = () => {
        cancelled = true;
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', onMouseMove);
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    }

    init();
    return () => {
      cancelled = true;
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
