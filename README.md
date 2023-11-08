# "Proyecto FP Web"

## Hotel Aura de Mallorca

*Aura de Mallorca: Vive la magia de la isla en un rincón exclusivo.*

En React y Express JS.
Web de un hotel con servicios extra para complejidad de implementar
api de meteorologia que te diga en base al clima local cuando reservas si puedes reservar o no.

Optional feature: crear una seccion de comunidad.

### Web del Hotel

#### Modals

Los modales serán ventanas "pop-up" para hacer la web más cómoda y sin tantas secciones, habrá modales user management (login, register and edit profile) y de booking.

#### Secciones

##### Inicio

* Página de bienvenida al Hotel Aura de Mallorca.

##### Servicios

* Página de servicios del hotel, donde se verá toda la información y
habrá la posibilidad de reservar directamente cada servicio.

##### Contacto

* Página de contacto donde a través de un formulario se podrá poner al cliente en comunicación con la empresa.

##### Reservar (Reservas botón)

* Modal de reservas abierta por el botón, aquí estará la funcionalidad principal de la web:
  * Datos personales (si está logeado se autorellena y no se puede modificar).
  * Decidir el plan (si VIP o Basic).
  * Seleccionar fechas de check-in y check-out (aquí se comprobará si está disponible por el servicio de detección meteorológica).
  * Seleccionar servicios (opcional).
  * Rellenar los guests de la reserva (puede incluirse al que hace la reserva del primer paso de datos personales o no).
  * Forma de pago (y pagar con Stripe o similares).
  * Página de confirmación de reserva (reserva realizada)

##### Gestor de traducciones (EN OTRO HOST, DESVINCULADO Y SOLO SE CONSUME DESDE LA WEB, PERO EL FRONT Y BACK ESTÁ EN OTRO PROYECTO, está en la carpeta (./cms/))

* Un gestor de traducciones que traducirá las descripciones y
otros campos que se generarán estableciendo unos nombres de keys
para posterior uso de api, json o importacion de base de datos
en la aplicacion en la que se utilizará. Se hace en Vue y laravel.

Constará de un frontend en Vue metido en el Laravel donde haremos la interfaz web y donde se introducirán las traducciones manualmente, así
dinámicamente las apps cliente de este gestor irán recuperando,
las nuevas traducciones. En cuanto al backend Laravel, guardará estas traducciones del frontend en su base de datos para así poder utilizarla en la app cliente como hemos mencionado.

En cuanto a la BDD, estarán: "users", "pagina", "idioma", "pagina-idioma", "seccion", "literales" (que son las traducciones) y "seccion-literal". Cada literal tendrá asociado una sección que a su vez esa sección
tendra asociado con fk una pagina, además de una sección padre (si la tiene) con un campo section_parent (si es null es que no tiene padre, sino tiene la id de la sección padre), y además las páginas tendrán asociados idiomas,
y cada literal code tendrá el formato de por ejemplo: "title_1,title_2...footer_1,footer_2, footer_3..."

Tablas: pagina (se refiere a que web se asocia, ej: vacalia, homerti...), seccion, literal, idioma, usuario.

Por ejemplo, le pides a la API:
/api/paginawebID/seccionDeLaPaginaID
->
/api/4/239 -> devuelve:

  [{
  "literal_code": "footer_21",
  "values": {
   "en": "__*",
   "es": "__*",
   "ca": "__*",
   "de": "__*"
  }
 },
 {
  "literal_code": "footer_57",
  "values": {
   "en": "__*",
   "es": "__*",
   "ca": "__*",
   "de": "__*"
  }
 }
]

/api/literalCode
->
/api/footer_34 -> devuelve:

  {
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

### Configuración e instalación

#### Configuración

Debemos cambiar el root password de mysql en XAMPP (si es windows, sino, después de instalar mariadb entraremos con ```sudo mysql o sudo mariadb``` y hacemos el ```CREATE USER 'x'@localhost IDENTIFIED BY 'password';``` y después hacer el ```GRANT ALL PRIVILEGES ON *.* TO 'x'@localhost IDENTIFIED BY 'password';``):

```Panel de control -> shell -> mysqladmin -u root password```

ENVIRONMENT VARIABLES:

* Frontend (.env):
  * FRONT_URL = dominio de la web CON HTTP ya que se redirigirá automáticamente (ej: http ://aurademallorca.com). Sin el espacio.
  * TRANSLATIONS_DATA_URL = ./
  * API_URL = dominio de la web CON HTTPS (ej: https ://aurademallorca.com). Sin el espacio.
* Backend (.env):
  * API_URL = dominio de la web CON HTTPS + /api (ej: https ://aurademallorca.com/api). Sin el espacio.
  * FRONT_URL = dominio de la web CON HTTP ya que se redirigirá automáticamente (ej: http ://aurademallorca.com). Sin el espacio.
  * CORS_ORIGIN_FRONT_URL = dominio de la web SIN HTTP ya que se sólo es para identificacion del dominio del cors, no del protocolo
  (ej: aurademallorca.com).
  * DB_URL ='127.0.0.1', referente a localhost, si falla poner este.

NO OLVIDARSE DE PONER EL .htaccess en el root de la carpeta de la app (si es en /var/www/html o dentro de alguna carpeta como /var/www/html) y configurar en /etc/apache2/apache2.conf en el ```<Directory>``` un AllowOverride all.

PONER EN ADAPTADOR PUENTE LA MÁQUINA VIRTUAL LINUX SI SE USA.

#### Instalación en Linux

* Requirements

  ```sudo apt update```

  ```sudo apt upgrade```

  ```sudo apt install openssh-server```

  ```sudo apt install nodejs npm```

  ```sudo apt install mariadb-server mariadb-client -y```

  ```sudo mysql_secure_installation``` (poner la password a 1234 y darle a que sí a eliminar root externo y dbs de test y todo lo que dice)

  ```sudo apt install apache2 -y```

  ```sudo apt -y install php php-common```

  ```sudo apt -y install php-cli php-fpm php-json php-pdo php-mysql php-zip php-gd php-mbstring php-curl php-xml php-pear php-bcmath```

  ```sudo apt -y install libapache2-mod-php```

  ```sudo a2enmod php7.*```

  ```sudo apt install phpmyadmin```

  ```sudo apt install net-tools```

  ```sudo apt install openssl -y```

  ```sudo a2enmod rewrite / sudo a2enmod headers```

  ```sudo a2enmod proxy / sudo a2enmod proxy_http```

  ```sudo systemctl restart apache2```

  ```sudo apt install pm2```

  ```sudo pm2 startup```

IMPORTANTE: EL PROXYPASS DEFINE QUE SI LLAMO A EL DOMINIO DEL VIRTUAL HOST + lo que haya en el proxy pass, me redirige a otra IP o Dominio con un puerto que yo quiera. Ejemplo: ProxyPass /api http ://localhost:3000/api.
Esto me está redirigiendo las peticiones de https ://hotelaurademallorca.com/api (que puedo hacer con axios en el front) en la maquina destino donde esta el frontend servido en producción a redirigir la petición axios al localhost de esa máquina al puerto 3000 + /api endpoint donde escucha mi nodejs express.

* Configuración de la web
  
  1. Recibir el código fuente completo con git o con FTP.
  2. Borrar los node_modules de las carpetas frontend y backend por tema permisos con ```sudo rm -r nombrecarpeta/```.
  3. Hacer un ```sudo npm install``` para cada carpeta.
  4. Setear los .env de cada carpeta (con un sudo nano mismo).
  5. Ir a la carpeta de frontend y generar el dist con ```sudo npm run build```.
  6. ```sudo mkdir /var/www/hotelaurademallorca```
  7. ```sudo chmod 755 /var/www/hotelaurademallorca```
  8. Entrar al dist/ del frontend con ```cd``` y ejecutar ```sudo cp * -r /var/www/hotelaurademallorca```
  9. Ir a la carpeta root del codigo fuente y moveremos la carpeta backend por cuestiones de claridad con ```sudo mv backend/ /var/www/hotemallorca```.
  10. Nos movemos a esa carpeta backend con el comando ya visto y vamos a hacer: ```sudo pm2 start index.js``` y ```sudo pm2 save``` en este orden.
  11. Creamos los virtualhosts de apache con ```sudo nano /etc/apache2/sites-available/hotelaurademallorca.conf``` (para HTTP) y ```sudo nano /etc/apache2/sites-available/hotelaurademallorca-ssl.conf``` (para HTTPS) y ponemos el contenido que necesitan los dos dentro de los archivos txt en el root del codigo fuente.
  12. Activamos los virtualhosts con ```sudo a2ensite hotelaurademallorca.conf``` y ```sudo a2ensite hotelaurademallorca-ssl.conf``` y luego debemos hacer un ```sudo systemctl reload apache2```.
  13. Agregamos a nuestro archivo /etc/hosts una línea nueva con: 127.0.0.1 hotelaurademallorca.com
  14. Hacemos lo mismo que el paso 13 pero en la máquina windows pero en vez de poner esa IP, ponemos la IP que tiene la VM o en donde esté alojado la app en ese momento (ej: 192.168.1.102 hotelaurademallorca.com).
