# Frontend de PlantPlan

Panel en React, Vite y Tailwind CSS. El banco, las fichas, el semillero y las tarjetas
de cultivos se conectan a Spring Boot con la cuenta autenticada. Los recordatorios
del panel usan datos de ejemplo.

## Instalar y arrancar

Desde la raíz del repositorio:

```powershell
cd frontend
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/`. El servidor solo escucha en loopback y falla si
el puerto está ocupado, en lugar de cambiarlo silenciosamente. También se puede
usar `http://localhost:5173/`. Para abrir el banco, inicia MySQL y Spring Boot y
entra con una cuenta existente. Vite reenvía `/api` a `http://127.0.0.1:8080`.
Si Spring Boot usa otro puerto, define `PLANTPLAN_API_TARGET` antes de iniciar Vite.

Para cargar dos cuentas ficticias con su propio banco de semillas, ejecuta
`.\scripts\seed-demo.ps1` desde la raíz del repositorio con Spring Boot y MySQL
arrancados. El script muestra los correos y las contraseñas al terminar.

Requiere Node >=22.12; probado con Node 24.18.0 y npm 11.16.0. El lockfile fija
la instalación probada. No se necesitan dependencias globales.

```powershell
npm run lint
npm test
npm run build
npm run preview
```

`lint` ejecuta ESLint y reglas JSX de accesibilidad y hooks, sin permitir avisos.
`test` usa el runner nativo de Node. `build` genera `dist/`; `preview` sirve esa
compilación en un puerto local que Vite indica al arrancar. `node_modules/`,
`dist/`, los archivos locales y los `.env` quedan excluidos mediante el
`.gitignore` del frontend. No se modifica el `.gitignore` raíz.

La integración de Tailwind usa su plugin oficial de Vite:
https://tailwindcss.com/docs/installation/using-vite

## Organización

### Criterio de textos de interfaz

Mantener este criterio en las páginas actuales y futuras: títulos breves,
etiquetas de acciones y datos útiles. No añadir subtítulos decorativos, lemas,
frases motivadoras ni descripciones que repitan lo que ya muestra la interfaz.
Los estados vacíos deben indicar directamente qué datos faltan. Conservar las
instrucciones necesarias, los mensajes de estado y los avisos sobre disponibilidad
de funciones.

```text
frontend/
  index.html
  package.json / package-lock.json
  vite.config.js / eslint.config.js
  .gitignore
  public/favicon.svg
  src/
    main.jsx                 # Entrada React
    App.jsx                  # Sesión y vistas del panel y del banco
    styles.css               # Tailwind, paleta, componentes y responsive
    data/demoData.js          # Datos de ejemplo con etiquetas localizadas
    i18n.js / locales/       # Configuración y catálogos de castellano y galego
    lib/presentation.js      # Límites y distribución de plantas visibles
    lib/api.js               # Peticiones HTTP y sesión de la pestaña
    components/
      Header.jsx             # Header y UserMenu nativo con details/summary
      RemindersSection.jsx   # Máximo de tres tareas y estado vacío
      SeedBankCard.jsx       # Estantería y SeedPacket
      SeedBankPage.jsx       # Inventario completo y alta de semillas
      SeedbedCard.jsx        # Germinación, planteles y SeedlingGroup
      GardenCard.jsx         # Cero, uno y varios huertos, con GardenPlot
      PlantIllustration.jsx  # SVG propios de plantas, brotes y símbolos
      PendingAction.jsx      # Acciones explícitamente pendientes
  tests/presentation.test.js
```

Tailwind resuelve la cuadrícula principal y utilidades de distribución. CSS
complementa la estantería, sobres, tierra, paleta, estados y reglas responsive.
Se usan fuentes del sistema y Georgia, sin descargar fuentes ni imágenes.
La navegación del banco usa el historial del navegador y las peticiones usan
`fetch`. ESLint y sus plugins son dependencias de desarrollo.

## Funcional y demostrativo

Funcionan el despliegue del menú con ratón/teclado, Escape para cerrarlo,
el enlace de salto, el foco en sobres y el selector de escenarios. Este último
permite revisar un huerto, varios, ninguno y ausencia de tareas, solo en memoria.

«Ver todas as sementes» abre `/sementes` y solicita iniciar sesión si hace falta.
El formulario recibe el nombre, la variedad opcional y la cantidad. La API crea una
ficha si hace falta o suma las semillas a la ficha que coincide. Los sobres y las
tarjetas de cultivos enlazan a `/fichas/{id}` para editarla. El token se guarda en `sessionStorage`
y se elimina al cerrar sesión o recibir un `401` en una petición protegida.
Desde una ficha se pueden sembrar semillas, registrar planteles y añadir plantas
directamente al huerto. Los lotes del semillero enlazan a su ficha para
trasplantar la cantidad elegida. Siembra y trasplante guardan origen y destino
en la misma operación de la API.
El panel enlaza al semillero completo (`/sementeiro`) y a todas las hortas
(`/hortas`). Sus formularios de alta reutilizan una ficha por nombre y variedad
o crean una ficha básica en la misma operación.

Los sobres de ejemplo conservan su foco y nombre accesible. Los sobres del banco
real abren la ficha asociada. Los catálogos contienen los textos en ambos idiomas.

Límites: seis sobres, tres recordatorios, dos huertos resumidos y 24 plantas
dibujadas en total en la sección Huerto. El presupuesto se reparte entre huertos
visibles. Germinación y planteles tienen doce dibujos como máximo por apartado.
Cada cantidad completa sigue disponible en texto; los excedentes se indican.
Las cantidades pequeñas conservan un dibujo por planta, sin multiplicadores.

## Backend revisado y límites de integración

El backend mantiene controladores, servicios, DTO, entidades y repositorios JPA
en `src/main/java/com/olalla/plantplan/`. Relaciones comprobadas:

- Usuario → huertos y fichas de cultivo.
- Ficha → semillas, planteles y cultivos.
- Huerto → cultivos; cada cultivo tiene también una ficha.
- Recordatorio → usuario y referencias opcionales a ficha, semilla, plantel,
  cultivo y huerto.

Los controladores ofrecen:

| Área | Endpoints comprobados |
| --- | --- |
| Autenticación | POST `/api/auth/register`, POST `/api/auth/login` |
| Huertos | CRUD `/api/gardens`, `/api/gardens/{id}`; GET `/api/users/{userId}/gardens` |
| Fichas | CRUD `/api/crop-sheets`, `/api/crop-sheets/{id}`; GET `/api/users/{userId}/crop-sheets` |
| Semillas | CRUD `/api/seeds`, `/api/seeds/{id}`; GET `/api/crop-sheets/{cropSheetId}/seeds` |
| Planteles | CRUD `/api/seedlings`, `/api/seedlings/{id}`; GET `/api/crop-sheets/{cropSheetId}/seedlings` |
| Cultivos | CRUD `/api/crops`, `/api/crops/{id}`; GET por huerto o ficha bajo `/api/gardens/{gardenId}/crops` y `/api/crop-sheets/{cropSheetId}/crops` |
| Recordatorios | GET `/api/users/{userId}/reminders?from=...&to=...`, GET `/api/reminders/{id}`, POST `/api/reminders/{id}/complete` |
| Tiempo | GET `/api/gardens/{gardenId}/weather` |
| Usuarios | GET `/api/users` (ADMIN); GET/PUT/DELETE `/api/users/{id}` (propio) |
| Salud | GET `/api/health` |

CRUD significa GET/POST sobre la colección y GET/PUT/DELETE sobre el identificador.
Login devuelve `token` y `user`; las rutas protegidas reciben Bearer JWT.

No existe entidad/controlador de bandejas o semilleros independientes.
`SeedlingResponse` contiene cantidades y fechas, pero no estado de germinación.
La separación visual entre germinación y planteles es solo una fixture, acordada
para esta fase. No se infiere un estado por el paso del tiempo.

`SeedResponse` aporta `quantity`, `cropSheetId` y `cropSheetName`, sin ilustración
o variedad separada; esa presentación necesitará composición con las fichas.
`CropResponse.initialQuantity` no se interpreta como un stock actual calculado
restando cosechas. Las cantidades dibujadas aquí son fixtures de plantas.
`ReminderResponse` usa `tipo` y `estado`, no `type` y `status`. Los datos de
presentación no pretenden ser respuestas de esos endpoints.

## Verificación de esta fase

- `npm run lint`: pasa, sin avisos.
- `npm test`: tres pruebas pasan (cantidades pequeñas, exceso de ilustraciones,
  inmutabilidad de entrada y estados vacíos/presupuesto cero).
- `npm run build`: pasa.
- Servidor Vite: HTTP 200 y navegador sin errores/avisos en consola observados.
- Reflow: 320, 390, 768, 1024 y 1440 px sin desbordamiento horizontal en la vista
  principal. Dos columnas desde 1024 px; una por debajo. Inspección visual de
  escritorio y móvil y revisión de escenarios vacíos y múltiples.
- Teclado: Enter abre el menú, Escape lo cierra; Tab alcanza los sobres con
  contorno visible y nombre con variedad, cantidad y disponibilidad futura.
- Semántica: header/main/nav/section, h1/h2/h3, etiquetas del selector, estado
  anunciado y enlace de salto. Los SVG que repiten cantidades/nombres son
  decorativos (`aria-hidden`, `focusable=false`).
- Contraste básico sobre 105 elementos de texto mediante estilos calculados y
  composición de fondos: sin valores por debajo de 4.5:1 para texto normal o
  3:1 para texto grande tras ajustar tonos. Los degradados se aproximaron con
  un tono de fondo conservador; esto no sustituye una auditoría formal.
- Preferencia de movimiento reducido respetada; no hay animaciones.

Pendientes: lector de pantalla real (NVDA/VoiceOver), zoom real al 200/400 %, otras
combinaciones de navegador/dispositivo y auditoría WCAG 2.2 AA completa. No se
afirma conformidad certificada.

## Auditoría de dependencias

`npm audit --omit=dev` no encuentra vulnerabilidades en dependencias de producción.
La auditoría completa informa de seis avisos moderados relacionados con
`minimatch` y herramientas ESLint. La versión ESLint 9 instalada emite además
un aviso de fin de soporte; se mantiene por compatibilidad declarada con
`eslint-plugin-jsx-a11y` (que admite hasta ESLint 9).

No se aplicó `npm audit fix --force`: proponía retrocesos incompatibles, no una
actualización segura de esta configuración. Revisar el conjunto ESLint/a11y
cuando publiquen una combinación compatible y mantenida. Estos paquetes no
forman parte del bundle del navegador.
