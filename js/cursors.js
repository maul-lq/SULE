function LERP(start, dest, speed) {
  return start + speed * (dest - start);
}

const LERP_SPEED = 0.25;
const SEND_INTERVAL = 100; //ms

class CursorsHandler {
  constructor() {
    // mouses_net

    this.lastTimeMMsended = 0;
    this.lastMPsent = { x: 0, y: 0 };
    this.currentHandler = null;

    // mouses_view
    this.cursors = {};
    this.animationFrame = null;
    this.highlightedId = null;
  }

  // mouses_net
  addMouseMovementSharing(sendFunction) {
    const diagramArea = app.diagrams.$diagramArea[0];

    if (!diagramArea) {
      console.error("Couldnt find diagram area! aMMS");
      return;
    }

    this.currentHandler = (event) => {
      const now = Date.now();

      if (now - this.lastTimeMMsended >= SEND_INTERVAL) {
        const activeDiagram = app.diagrams.getCurrentDiagram();
        if (!activeDiagram) return;

        const editor = app.diagrams;

        if (editor) {
          // TODO
          // añadir icono al minimapa (canvas id="minimap") (diagramArea.nextElementSibling) (opcional)
          // añadir icono al workin diagrams (app.sidebar.$workingDiagrams)
          const diagramX = activeDiagram._originX;
          const diagramY = activeDiagram._originY;
          const scale = app.diagrams.getZoomLevel();
          const rect = diagramArea.getBoundingClientRect();
          let diagram = activeDiagram._id;

          const dataToSend = {
            x: (event.clientX - rect.left) / scale - activeDiagram._originX,
            y: (event.clientY - rect.top) / scale - activeDiagram._originY,
            diagram: diagram,
          };

          if (
            this.lastMPsent.x == dataToSend.x &&
            this.lastMPsent.y == dataToSend.y
          )
            return; //dont send if mouse hasent moved

          sendFunction(dataToSend);

          this.lastTimeMMsended = now;
          this.lastMPsent.x = dataToSend.x;
          this.lastMPsent.y = dataToSend.y;
        }
      }
    };

    diagramArea.addEventListener("mousemove", this.currentHandler);
    this.animate();
  }

  removeMouseMovementSharing() {
    const diagramArea = app.diagrams.$diagramArea[0];
    if (diagramArea && this.currentHandler) {
      diagramArea.removeEventListener("mousemove", this.currentHandler);
      this.currentHandler = null;
    }

    this.stopAnimation();
  }

  // mouses_view
  addCursor(id, name) {
    const container = app.diagrams.$diagramArea[0];
    const colors = [
      "#FF5733", // rojo-naranja
      "#33FF57", // verde
      "#3357FF", // azul
      "#F333FF", // magenta
      "#FFB833", // naranja
      "#33FFF3", // cian
      "#8E44AD", // púrpura
      "#2ECC71", // verde oscuro
      "#1ABC9C", // turquesa
    ];

    const foregroundColors = [
      "#000000", // para #FF5733
      "#000000", // para #33FF57
      "#FFFFFF", // para #3357FF
      "#000000", // para #F333FF
      "#000000", // para #FFB833
      "#000000", // para #33FFF3
      "#FFFFFF", // para #8E44AD
      "#000000", // para #2ECC71
      "#000000", // para #1ABC9C
    ];

    const i = Math.floor(Math.random() * colors.length);

    const color = colors[i];
    const fg = foregroundColors[i];

    const el = document.createElement("div");
    el.id = `cursor-${id}`;
    el.className = "live-share-cursor";

    el.innerHTML = `
      <svg style="fill: ${color}; width: 20px; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.4));" viewBox="0 0 24 24">
        <path d="M7,2l12,11.2l-5.8,0.5l3.3,7.3l-2.2,1l-3.2-7.4L7,19V2z"/>
      </svg>
      <div class="cursor-label" style="background: ${color}; color: ${fg};">${name}</div>
    `;
    container.appendChild(el);

    this.cursors[id] = {
      id: id,
      name: name,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      element: el,
    };
  }

  removeCursor(id) {
    if (this.cursors[id]) {
      if (this.cursors[id].element) {
        this.cursors[id].element.style.display = "none";
        this.cursors[id].element.remove();
      }
      delete this.cursors[id];
    }
  }

  updateMousePosition({ id, x, y, diagram, name, zoom, originX, originY }) {
    if (!this.cursors[id]) {
      this.addCursor(id, name || "Anonymous");
    }

    // Guardamos el destino. El LERP se encargará de moverlo en el loop
    this.cursors[id].targetX = x;
    this.cursors[id].targetY = y;
    this.cursors[id].diagram = diagram;
    this.cursors[id].zoom = zoom;
    this.cursors[id].originX = originX;
    this.cursors[id].originY = originY;

    // Solo mostrar si está en el mismo diagrama que nosotros
    const currentDiagram = app.diagrams.getCurrentDiagram();
    if (currentDiagram && currentDiagram._id === diagram) {
      this.cursors[id].element.style.display = "block";
    } else {
      this.cursors[id].element.style.display = "none";
    }
  }

  animate() {
    const scale = app.diagrams.getZoomLevel();

    for (let id in this.cursors) {
      const c = this.cursors[id];

      // Aplicamos el LERP para suavizar el movimiento
      c.x = LERP(c.x, c.targetX, LERP_SPEED);
      c.y = LERP(c.y, c.targetY, LERP_SPEED);

      // Actualizamos la posición física (multiplicamos por escala para que encaje)
      if (c.element) {
        const currentDiagram = app.diagrams.getCurrentDiagram();
        if (currentDiagram && currentDiagram._id === c.diagram) {
          const localScale = app.diagrams.getZoomLevel();
          const localOriginX = currentDiagram._originX;
          const localOriginY = currentDiagram._originY;

          const physicalX = (c.x + localOriginX) * localScale;
          const physicalY = (c.y + localOriginY) * localScale;

          c.element.style.transform = `translate(${physicalX}px, ${physicalY}px)`;
          c.element.style.display = "block";
        } else {
          c.element.style.display = "none";
        }
      }
    }
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setHighlight(id) {
    this.highlightedId = id;
    // Clear other highlights
    for (const [key, c] of Object.entries(this.cursors)) {
      if (key !== id && c.element) {
        c.element.style.zIndex = "100";
        c.element.style.filter = "none";
        const svg = c.element.querySelector("svg");
        if (svg) svg.style.transform = "scale(1)";
      }
    }
    // Set active highlight
    if (id && this.cursors[id]) {
      const c = this.cursors[id];
      c.element.style.zIndex = "1000";
      c.element.style.filter = "drop-shadow(0 0 5px rgba(241, 196, 15, 0.6))";
      const svg = c.element.querySelector("svg");
      if (svg) svg.style.transform = "scale(1.15)";
    }
  }

  removeAllCursors() {
    for (const [key, value] of Object.entries(this.cursors)) {
      this.removeCursor(key);
    }
  }
}

module.exports = { CursorsHandler };
