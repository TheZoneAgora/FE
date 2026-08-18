// design/agora-arena.html의 burst() 컨페티 포팅. 순수 DOM — 클라이언트 전용.

const COLORS = ["#FF5A1F", "#FFF8ED", "#24C77A", "#F6B73C"];

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function burst(x: number, y: number, reduced: boolean): void {
  if (reduced || typeof document === "undefined") return;
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("div");
    const s = rand(5, 10);
    p.style.cssText = `position:fixed;z-index:300;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:${
      Math.random() < 0.5 ? "50%" : "2px"
    };background:${COLORS[i % 4]};pointer-events:none;`;
    document.body.appendChild(p);
    const ang = rand(0, Math.PI * 2);
    const dist = rand(60, 160);
    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 40}px) rotate(${rand(-260, 260)}deg)`,
          opacity: 0,
        },
      ],
      { duration: rand(700, 1100), easing: "cubic-bezier(0.22,1,0.36,1)" }
    ).onfinish = () => p.remove();
  }
}
