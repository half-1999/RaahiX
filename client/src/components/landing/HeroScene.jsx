import { useEffect, useRef } from 'react';
import { HeroRouteArt } from './illustrations';

export default function HeroScene() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const fine = window.matchMedia('(pointer: fine)').matches;
    const hover = window.matchMedia('(hover: hover)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || !hover || reduce) return undefined;

    const layers = {
      car: root.querySelector('[data-parallax="car"]'),
      road: root.querySelectorAll('[data-parallax="road"]'),
      pinA: root.querySelector('[data-parallax="pin-a"]'),
      pinB: root.querySelector('[data-parallax="pin-b"]'),
      city: root.querySelector('[data-parallax="city"]'),
      cloud: root.querySelector('[data-parallax="cloud"]'),
      markers: root.querySelectorAll('[data-parallax="marker"]'),
    };

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (event) => {
      const rect = root.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (layers.car) {
        layers.car.style.transform = `translate(${currentX * 14}px, ${currentY * 8}px)`;
      }
      layers.road.forEach((node) => {
        node.style.transform = `translate(${currentX * 4}px, ${currentY * 3}px)`;
      });
      if (layers.pinA) {
        layers.pinA.style.transform = `translate(${currentX * -8}px, ${currentY * -6}px)`;
      }
      if (layers.pinB) {
        layers.pinB.style.transform = `translate(${currentX * 10}px, ${currentY * -4}px)`;
      }
      if (layers.city) {
        layers.city.style.transform = `translate(${currentX * -5}px, ${currentY * 2}px)`;
      }
      if (layers.cloud) {
        layers.cloud.style.transform = `translate(${currentX * 6}px, ${currentY * -3}px)`;
      }
      layers.markers.forEach((node, index) => {
        const dir = index % 2 === 0 ? 1 : -1;
        node.style.transform = `translate(${currentX * 7 * dir}px, ${currentY * 5}px)`;
      });

      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    root.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      root.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="rx-hero-scene relative overflow-hidden rounded-[1.75rem]">
      <HeroRouteArt />
    </div>
  );
}
