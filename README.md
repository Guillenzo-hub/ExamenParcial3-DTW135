# Examen Parcial 3: La Cámara de los Cinco Desafíos

Este es el proyecto desarrollado para el **Tercer Examen Parcial** de la materia **Desarrollo de Tecnologías Web (DTW135)**. Se trata de un juego interactivo tipo "Escape Room" en el cual el usuario debe resolver 5 desafíos secuenciales utilizando diferentes APIs modernas de JavaScript.

##  Datos del Alumnos
* Marvin Renè Batres Rivera BR10022
* Carlos Roberto Guillen Zometa GZ22006
* Nehemías Esaú Peñate Cortez PC12028
* Oscar Alexis Orantes Suarez OS23002

---

##  Descripción del Proyecto
"La Cámara de los Cinco Desafíos" es una aplicación web interactiva diseñada para demostrar el uso práctico de APIs avanzadas del navegador web. A través de una interfaz limpia, el usuario avanza de nivel a nivel conforme completa las tareas de cada cámara:

1.  **Nivel 1: El Guardián de la Ubicación (Geolocation API):** Obtiene y muestra la latitud y longitud actuales del usuario para validar el acceso al mapa.
2.  **Nivel 2: El Cartógrafo Perdido (Canvas API):** Dibuja dinámicamente un mapa conceptual simplificado en un elemento `<canvas>` y posiciona al explorador utilizando sus coordenadas.
3.  **Nivel 3: La Evidencia del Explorador (Media Devices API):** Utiliza la cámara del dispositivo para capturar una foto real como evidencia. Cuenta con un sistema alternativo (fallback) para subir una imagen local en caso de no tener cámara disponible.
4.  **Nivel 4: El Núcleo de Procesamiento (Web Worker - Básico):** Simula la lectura y procesamiento de 20,000 datos de sensores (temperatura y humedad) en segundo plano para evitar congelar la interfaz de usuario.
5.  **Nivel 5: El Portal Cuántico (Web Worker - Avanzado):** Procesa un volumen masivo de 250,000 registros de datos. Filtra lecturas válidas, calcula promedios de temperatura, humedad y presión, extrae el top 10 de valores extremos y permite exportar el reporte final en formato JSON.

---

##  Tecnologías Utilizadas
*   **HTML5** - Estructura semántica.
*   **CSS3** - Estilos personalizados con degradados modernos para el ambiente oscuro.
*   **Bootstrap 5 & Bootstrap Icons** - Framework CSS para el diseño responsivo, botones y tarjetas.
*   **Vanilla JavaScript** - Lógica del juego, manipulación del DOM y control de estado (usando `localStorage` para guardar el progreso).
*   **Web Workers API** - Procesamiento de datos en hilos secundarios para optimizar el rendimiento.

---

##  Estructura del Proyecto
*   `index.html` - Estructura principal y maquetación de las 5 secciones (niveles) del juego.
*   `style.css` - Estilos adicionales y animaciones (como el efecto fade-in al cambiar de nivel).
*   `app.js` - Control del flujo de la app, interacción con el DOM, persistencia con `localStorage`, inicialización del Canvas, cámara y envío de datos al worker.
*   `worker.js` - Hilo secundario para procesar la simulación de datos masivos sin afectar el rendimiento del hilo principal.

---

##  Instrucciones de Ejecución
Para que la cámara y la geolocalización funcionen correctamente por políticas de seguridad del navegador, se recomienda ejecutar el proyecto en un servidor local (por ejemplo, con la extensión **Live Server** de VS Code) o bien a través de un dominio seguro `https://`.

1. Descarga o clona los archivos del proyecto.
2. Abre la carpeta del proyecto en tu editor de código (ej. VS Code).
3. Inicia tu servidor local preferido (ej. ejecuta `Live Server` sobre `index.html`).
4. Abre `http://localhost:5500` (o el puerto correspondiente) en tu navegador web.
5. ¡Juega y supera los 5 desafíos!
