import { C } from "../theme";
import { Logo } from "./ui";

// Pantalla de carga: fondo oscuro, logo que respira. Aparece con un pequeño retraso
// para que las cargas rápidas no parpadeen.
export function Splash() {
  return (
    <div role="status" aria-label="Cargando" style={{ position: "fixed", inset: 0, zIndex: 1000, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", animation: "cq-fade .25s ease .12s both" }}>
      <div style={{ animation: "cq-breathe 1.6s ease-in-out infinite" }}><Logo size={44} /></div>
      <style>{`
        @keyframes cq-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cq-breathe { 0%, 100% { opacity: .35; transform: scale(.96); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { [role="status"] > div { animation: none !important; opacity: .8; } }
      `}</style>
    </div>
  );
}
