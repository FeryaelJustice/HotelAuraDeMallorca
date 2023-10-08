# "Proyecto FP Web"

## Hotel "Aura de Mallorca"

Web de un hotel con servicios extra para complejidad de implementar
api de meteorologia que te diga en base al clima local cuando reservas si puedes reservar o no, además de que tenga un sección dentro de la web sugerida por "Homerti" de un gestor de traducciones que consumirá la propia página como otras seleccionadas.

Opcional feature: crear una seccion de comunidad,

### Web del Hotel

#### Secciones

##### Inicio

##### Gestor de traducciones

- Un gestor de traducciones que traducirá las descripciones y
otros campos que se generarán estableciendo unos nombres de keys
para posterior uso de api, json o importacion de base de datos
en la aplicacion en la que se utilizará.

  Constará de un frontend en React (integrado con el mismo de la web, ya que es una sección) donde haremos la interfaz web
en donde se introducirán las traducciones manualmente, así
dinámicamente las apps cliente de este gestor irán recuperando,
las nuevas traducciones. En cuanto al backend (mismo que el de la web también), guardará estas traducciones
del frontend en su base de datos para así poder utilizarla en la app
cliente como hemos mencionado.

  En cuanto a la BDD, estarán: "pagina", "seccion" y "literales" (que son las traducciones) y cada literal tendra asociado una seccion que a su vez
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
   "en": "___",
   "es": "___",
   "ca": "___",
   "de": "___"
  }
 },
 {
  "literal_key": "footer_57",
  "values": {
   "en": "___",
   "es": "___",
   "ca": "___",
   "de": "___"
  }
 }
]

  /api/paginawebID/seccionDeLaPaginaID/literalKeyID
->
/api/4/239/footer_34 -> devuelve:

  {
  "literal_key": "footer_23",
  "values": {
   "en": "___",
   "es": "___",
   "ca": "___",
   "de": "___"
  }
 }

###### Desarrollo

- Backend:
Creado haciendo mkdir (nombre carpeta), luego entrando al folder y hacer ```npm init``` y ```npm install express```.
- Frontend:
Creado haciendo ```npm create vite@latest appname```.
