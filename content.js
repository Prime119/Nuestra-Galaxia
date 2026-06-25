/* ============================================================
   CONTENIDO DE LA GALAXIA  ✏️  (EDITA AQUÍ)
   ------------------------------------------------------------
   Cada "astro" se puede tocar y abre una ventana con:
     - un poema  -> { tipo: "poema", texto: "..." }
     - una imagen -> { tipo: "imagen", url: "ENLACE" }
     - un video  -> { tipo: "video", url: "ENLACE" }

   Para imágenes/videos puedes pegar enlaces de Google Drive
   o YouTube. (Para Drive: usa el enlace de "Compartir".)

   tipo de astro: "estrella" | "planeta" | "agujero" | "sistema"
   errante: true  -> el astro vaga por la galaxia esquivando a los demás
   orbita: { radio, velocidad, fase, inclinacion } -> gira alrededor del centro
   ============================================================ */

export const CONTENT = {
  astros: [
    {
      id: "estrella-1",
      tipo: "estrella",
      titulo: "Nuestra estrella",
      color: "#ffe6a0",
      tamano: 0.55,
      orbita: { radio: 3.6, velocidad: 0.05, fase: 0.4, inclinacion: 0.18 },
      contenido: {
        tipo: "poema",
        texto:
          "Aquí irá tu primer poema.\n\nCada línea se respeta tal cual,\npara que escribas lo que sientes.",
      },
    },
    {
      id: "estrella-2",
      tipo: "estrella",
      titulo: "Brillo lejano",
      color: "#bcd8ff",
      tamano: 0.5,
      orbita: { radio: 5.4, velocidad: 0.04, fase: 3.2, inclinacion: 0.12 },
      contenido: {
        tipo: "imagen",
        url: "", // pega aquí un enlace de imagen (Drive / Imgur)
      },
    },
    {
      id: "planeta-errante-1",
      tipo: "planeta",
      titulo: "Planeta errante",
      color: "#7fb0ff",
      tamano: 0.42,
      errante: true,
      inicio: { radio: 6.2, fase: 1.0 },
      contenido: {
        tipo: "poema",
        texto: "Un planeta que vaga sin chocar con nada...\nigual que mis pensamientos contigo.",
      },
    },
    {
      id: "planeta-errante-2",
      tipo: "planeta",
      titulo: "Mundo viajero",
      color: "#ff9ec4",
      tamano: 0.46,
      errante: true,
      inicio: { radio: 7.5, fase: 4.2 },
      contenido: {
        tipo: "video",
        url: "", // pega aquí un enlace de YouTube o Drive
      },
    },
    {
      id: "agujero-1",
      tipo: "agujero",
      titulo: "Agujero negro",
      tamano: 0.7,
      orbita: { radio: 6.8, velocidad: 0.03, fase: 1.6, inclinacion: 0.1 },
      contenido: {
        tipo: "poema",
        texto: "Hay cosas que atraen todo a su alrededor.\nTú eres mi centro de gravedad.",
      },
    },
    {
      id: "sistema-1",
      tipo: "sistema",
      titulo: "Nuestro sistema",
      color: "#ffcf6b",
      tamano: 0.8,
      orbita: { radio: 9.0, velocidad: 0.02, fase: 4.7, inclinacion: 0.16 },
      contenido: {
        tipo: "poema",
        texto: "El sol que da vida a todo nuestro pequeño universo.",
      },
      planetas: [
        {
          id: "sis1-p1",
          titulo: "Planeta interior",
          color: "#ff9ec4",
          tamano: 0.2,
          radio: 1.1,
          velocidad: 0.6,
          fase: 0,
          contenido: { tipo: "poema", texto: "El más cercano al corazón." },
        },
        {
          id: "sis1-p2",
          titulo: "Planeta azul",
          color: "#6fb0ff",
          tamano: 0.26,
          radio: 1.7,
          velocidad: 0.42,
          fase: 1.6,
          contenido: { tipo: "imagen", url: "" },
        },
        {
          id: "sis1-p3",
          titulo: "Planeta lejano",
          color: "#c9a6ff",
          tamano: 0.23,
          radio: 2.4,
          velocidad: 0.3,
          fase: 3.4,
          contenido: { tipo: "poema", texto: "Lejano, pero siempre en órbita de ti." },
        },
      ],
    },
  ],
};
