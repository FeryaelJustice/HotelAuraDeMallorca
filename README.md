# "Proyecto FP Web"

## Hotel Aura de Mallorca

*Aura de Mallorca: Vive la magia de la isla en un rincón exclusivo.*

En React y Express JS.
Web de un hotel con servicios extra para complejidad de implementar
api de meteorologia que te diga en base al clima local cuando reservas si puedes reservar o no, además de que tenga un sección dentro de la web sugerida por "Homerti" de un gestor de traducciones EXTERNO EN OTRO DOMINIO Y HOSTING que consumirá la propia página como otras seleccionadas.

Optional feature: crear una seccion de comunidad.

### Web del Hotel

#### Modals

Los modales serán ventanas "pop-up" para hacer la web más cómoda y sin tantas secciones, habrá modales de login, register y edit profile.

#### Secciones

##### Inicio

* Página de bienvenida al Hotel Aura de Mallorca.

##### Servicios

* Página de servicios del hotel, donde se verá toda la información y
habrá la posibilidad de reservar directamente cada servicio.

##### Contacto

* Página de contacto donde a través de un formulario se podrá poner al cliente en comunicación con la empresa.

##### Reservar (Reservas botón)

* Página de reservas, aquí estará la funcionalidad principal de la web:
  * Primero, habrá dos botones para elegir si ver tus reservas ya hechas o hacer una nueva reserva (cada una será un modal).
  * Seleccionar fechas de check-in y check-out (aquí se comprobará si está disponible por el servicio de detección meteorológica).
  * Decidir el plan (si VIP o Basic).
  * Datos personales (si está logeado se autorellena y no se puede modificar).
  * Datos de facturación (billing, y lo mismo que con los personales en cuanto al sistema de sesiones).
  * Forma de pago.
  * Página de confirmación de reserva (reserva realizada)

##### Gestor de traducciones (EN OTRO HOST, DESVINCULADO Y SOLO SE CONSUME DESDE LA WEB, PERO HACER FRONT Y BACK EN OTRO PROYECTO, está en la carpeta (./cms/))

* Un gestor de traducciones que traducirá las descripciones y
otros campos que se generarán estableciendo unos nombres de keys
para posterior uso de api, json o importacion de base de datos
en la aplicacion en la que se utilizará. Se hace en Vue y laravel.

  Constará de un frontend en React (integrado con el mismo de la web, ya que es una sección) donde haremos la interfaz web
en donde se introducirán las traducciones manualmente, así
dinámicamente las apps cliente de este gestor irán recuperando,
las nuevas traducciones. En cuanto al backend (mismo que el de la web también), guardará estas traducciones
del frontend en su base de datos para así poder utilizarla en la app
cliente como hemos mencionado.

  En cuanto a la BDD, estarán: "pagina", "idioma", "pagina-idioma", "seccion" y "literales" (que son las traducciones) y cada literal tendra asociado una seccion que a su vez
tendra asociado con fk una pagina, y ademas asociado un idioma,
y tendran el formato de llave de por ejemplo "title_1,title_2...footer_1,footer_2, footer_3..."

  Tablas: paginas (se refiere a que web se asocia, ej: vacalia, homerti...), secciones, literales, idiomas, usuarios.

  Por ejemplo, le pides a la API:
  /api/paginawebID/seccionDeLaPaginaID
  ->
  /api/4/239 -> devuelve:

  [{
  "literal_key": "footer_21",
  "values": {
   "en": "__*",
   "es": "__*",
   "ca": "__*",
   "de": "__*"
  }
 },
 {
  "literal_key": "footer_57",
  "values": {
   "en": "__*",
   "es": "__*",
   "ca": "__*",
   "de": "__*"
  }
 }
]

  /api/paginawebID/seccionDeLaPaginaID/literalKeyID
->
/api/4/239/footer_34 -> devuelve:

  {
  "literal_key": "footer_23",
  "values": {
   "en": "__*",
   "es": "__*",
   "ca": "__*",
   "de": "__*"
  }
 }

###### Diseño y planificación

* Planificación:

  Se usa el diagrama de Gantt con Gantt Project y Trello (Kanban metodologia ágil).

* Diseño;

  Se usa Figma para el Wireframe y el Prototype.

  [Herramienta de contraste de colores (accesibilidad)](https://webaim.org/resources/contrastchecker/)

###### Desarrollo

* Backend:

  Creado haciendo mkdir (nombre carpeta), luego entrando al folder y hacer ```npm init``` y ```npm install express```.

* Frontend:

  Creado haciendo ```npm create vite@latest appname```.

###### Notas

Para testear weather API: crear acceso directo del chrome y poner:
```"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=%LOCALAPPDATA%\Google\chromeTemp```
