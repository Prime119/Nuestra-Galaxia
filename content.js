/* ============================================================
   CONTENIDO DE LA GALAXIA  ✏️  (EDITA AQUÍ)
   ------------------------------------------------------------
   Cada "astro" se puede tocar y abre una ventana con:
     - un poema  -> { tipo: "poema", texto: "..." }
     - una imagen -> { tipo: "imagen", url: "ENLACE" }
     - un video  -> { tipo: "video", url: "ENLACE" }

   Para imágenes/videos pega enlaces de Google Drive o YouTube.
   (En Drive: compartir como "Cualquiera con el enlace".)

   tipo de astro: "estrella" | "planeta" | "agujero" | "sistema"
   errante: true  -> el astro vaga por la galaxia esquivando a los demás
   ¡Puedes añadir TANTOS astros como quieras! Se colocan solos.
   Si quieres fijar uno, puedes añadir: orbita:{radio,velocidad,fase,inclinacion}
   ============================================================ */

export const CONTENT = {
  escala: 1.0, // tamaño global de todos los astros (sube/baja a la vez)

  astros: [
    // ---------- ESTRELLAS Y PLANETAS CON CONTENIDO ----------
    { tipo: "estrella", titulo: "Estrella 1", color: "#ffe6a0", contenido: { tipo: "poema", texto: "Aquí va tu poema 1..." } },
    { tipo: "estrella", titulo: "Estrella 2", color: "#bcd8ff", contenido: { tipo: "imagen", url: "" } },
    { tipo: "estrella", titulo: "Estrella 3", color: "#ff9ec4", contenido: { tipo: "poema", texto: "Aquí va tu poema 2..." } },
    { tipo: "estrella", titulo: "Estrella 4", color: "#fff0c4", contenido: { tipo: "video", url: "" } },
    { tipo: "planeta", titulo: "Planeta 1", color: "#7fb0ff", contenido: { tipo: "imagen", url: "" } },
    { tipo: "planeta", titulo: "Planeta 2", color: "#ff9ec4", contenido: { tipo: "poema", texto: "Aquí va tu poema 3..." } },
    { tipo: "planeta", titulo: "Planeta 3", color: "#9fe0c0", contenido: { tipo: "imagen", url: "" } },
    { tipo: "planeta", titulo: "Planeta 4", color: "#c9a6ff", contenido: { tipo: "video", url: "" } },
    { tipo: "planeta", titulo: "Planeta 5", color: "#ffb27f", contenido: { tipo: "poema", texto: "Aquí va tu poema 4..." } },
    { tipo: "estrella", titulo: "Estrella 5", color: "#8fd0ff", contenido: { tipo: "imagen", url: "" } },
    { tipo: "planeta", titulo: "Planeta 6", color: "#7fb0ff", contenido: { tipo: "poema", texto: "Aquí va tu poema 5..." } },
    { tipo: "estrella", titulo: "Estrella 6", color: "#ffd9a0", contenido: { tipo: "video", url: "" } },
    { tipo: "planeta", titulo: "Planeta 7", color: "#ff7fb0", contenido: { tipo: "imagen", url: "" } },
    { tipo: "estrella", titulo: "Estrella 7", color: "#cfe2ff", contenido: { tipo: "poema", texto: "Aquí va tu poema 6..." } },

    // ---------- ASTROS ERRANTES (vagan y esquivan) ----------
    { tipo: "planeta", titulo: "Errante 1", color: "#7fb0ff", errante: true, contenido: { tipo: "poema", texto: "Un mundo que viaja sin chocar con nada." } },
    { tipo: "planeta", titulo: "Errante 2", color: "#ff9ec4", errante: true, contenido: { tipo: "imagen", url: "" } },
    { tipo: "estrella", titulo: "Errante 3", color: "#fff0c4", errante: true, contenido: { tipo: "video", url: "" } },
    { tipo: "planeta", titulo: "Errante 4", color: "#c9a6ff", errante: true, contenido: { tipo: "poema", texto: "Aquí va tu poema 7..." } },

    // ---------- AGUJEROS NEGROS (estilo Interstellar) ----------
    { tipo: "agujero", titulo: "Agujero negro 1", contenido: { tipo: "poema", texto: "Tú eres mi centro de gravedad." } },
    { tipo: "agujero", titulo: "Agujero negro 2", errante: true, contenido: { tipo: "imagen", url: "" } },

    // ---------- SISTEMA SOLAR (sol + planetas, todos clickeables) ----------
    {
      tipo: "sistema",
      titulo: "Nuestro sistema",
      color: "#ffcf6b",
      contenido: { tipo: "poema", texto: "El sol que da vida a nuestro pequeño universo." },
      planetas: [
        { titulo: "Planeta interior", color: "#ff9ec4", contenido: { tipo: "poema", texto: "El más cercano al corazón." } },
        { titulo: "Planeta azul", color: "#6fb0ff", contenido: { tipo: "imagen", url: "" } },
        { titulo: "Planeta lejano", color: "#c9a6ff", contenido: { tipo: "video", url: "" } },
      ],
    },
  ],
};
