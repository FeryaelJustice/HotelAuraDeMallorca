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

Si un usuario es desactivado por el sistema de castigos, además de poner el isEnabled a true de app_user, hay que poner el enabledByAdmin a 1 también para que haga el doble check.

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

  ```sudo systemctl enable ssh```

  ```sudo apt install nodejs npm```

  ```sudo apt install mariadb-server mariadb-client -y```

  ```sudo systemctl enable mariadb```

  ```sudo mysql_secure_installation``` (poner la password a 1234 y darle a que sí a eliminar root externo y dbs de test y todo lo que dice)

  ```sudo apt install apache2 -y```

  ```sudo systemctl enable apache2```

  ```sudo apt -y install php php-common```

  ```sudo apt -y install php-cli php-fpm php-json php-pdo php-mysql php-zip php-gd php-mbstring php-curl php-xml php-pear php-bcmath```

  ```sudo apt -y install libapache2-mod-php```

  ```sudo a2enmod php8.*```

  ```sudo apt install net-tools```

  ```sudo apt install openssl -y```

  ```sudo a2enmod rewrite / sudo a2enmod headers```

  ```sudo a2enmod proxy / sudo a2enmod proxy_http```

  ```sudo systemctl restart apache2```

  ```sudo npm -g install pm2```

  ```sudo pm2 startup```

  ```sudo apt install ufw```

  ```sudo systemctl enable ufw```

  ```sudo ufw allow 80```

  ```sudo ufw allow 443```

  ```sudo ufw allow 3000```

  ```sudo ufw allow http```

  ```sudo ufw allow https```

  ```sudo ufw allow mysql```

  ```sudo ufw allow ssh```

IMPORTANTE: EL PROXYPASS DEFINE QUE SI LLAMO A EL DOMINIO DEL VIRTUAL HOST + lo que haya en el proxy pass, me redirige a otra IP o Dominio con un puerto que yo quiera. Ejemplo: ProxyPass /api http ://localhost:3000/api.
Esto me está redirigiendo las peticiones de https ://hotelaurademallorca.com/api (que puedo hacer con axios en el front) en la maquina destino donde esta el frontend servido en producción a redirigir la petición axios al localhost de esa máquina al puerto 3000 + /api endpoint donde escucha mi nodejs express.

* Configuración de la web

  * Pre-config:

    ```sudo apt install phpmyadmin```

    ```sudo mysql < /usr/share/phpmyadmin/sql/create_tables.sql```

    (si los 2 pasos anteriores fallan): [Instalación de PHPMyAdmin manual en Debian](https://www.digitalocean.com/community/tutorials/how-to-install-phpmyadmin-from-source-debian-10)

    ```sudo mariadb```

    ```GRANT SELECT, INSERT, UPDATE, DELETE ON phpmyadmin.* TO 'pma'@'localhost' IDENTIFIED BY 'password';``` (put the same password that you gonna put in the .env of the app for the connection and that u put in mariadb secure installation)

    ```GRANT ALL PRIVILEGES ON ON *.* TO 'admin'@'localhost' IDENTIFIED BY 'password';``` (put the same password that you gonna put in the .env of the app for the connection and that u put in mariadb secure installation)

    ```GRANT ALL PRIVILEGES ON *.* TO 'fer'@'localhost' IDENTIFIED BY 'password';``` (put the same password that you gonna put in the .env of the app for the connection and that u put in mariadb secure installation)

    ```GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY 'password';``` (put the same password that you gonna put in the .env of the app for the connection and that u put in mariadb secure installation)

    ```FLUSH PRIVILEGES;```

    ```EXIT;```

    (if you installed phpmyadmin with the manual way link, you can avoid this, you choose the way you want to install phpmyadmin)

    ```wget https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.tar.gz```

    ```sudo tar xvf phpMyAdmin-latest-all-languages.tar.gz```

    ```sudo mv phpMyAdmin-*-all-languages/ /var/www/html/phpmyadmin```

    ```cd /var/www/html/phpmyadmin```

    ```sudo cp config.sample.inc.php config.inc.php```

    ```sudo mkdir tmp```

    ```openssl rand -base64 32``` (copy the value given)

    ```sudo nano /var/www/html/phpmyadmin/config.inc.php```

    Copy the value of pwgen into $cfg['blowfish_secret']

    Uncomment all the lines of the sections: *User used to manipulate with storage* and *Storage database and tables* and one last line to this last mentioned section with: ```$cfg['TempDir'] = '/var/lib/phpmyadmin/tmp';```

    ```sudo chown -R www-data:www-data /var/www/html/phpmyadmin```

    (avoid until here)

    ```sudo nano /etc/apache2/conf-available/phpmyadmin.conf```: put the content of phpmyadmin-virtualhost

    ```sudo a2enconf phpmyadmin.conf```

    ```sudo systemctl restart apache2```

* ACTIVAR SSL antes de config de la app (que se configura para https):
  Seguir el tutorial de: <https://wiki.debian.org/Self-Signed_Certificate>, hacer cada paso con ```sudo```

* Config de la app:

  1. Recibir el código fuente completo con git o con FTP.
  2. Borrar los node_modules de las carpetas frontend y backend por tema permisos con ```sudo rm -r nombrecarpeta/```.
  3. Hacer un ```sudo npm install``` para cada carpeta.
  4. Setear los .env de cada carpeta (con un sudo nano mismo).
  5. Ir a la carpeta de frontend y generar el dist con ```sudo npm run build```.
  6. ```sudo mkdir /var/www/html/hotelaurademallorca```
  7. ```sudo chown www-data:www-data /var/www/html/hotelaurademallorca```
  8. ```sudo chmod 755 /var/www/html/hotelaurademallorca```
  9. Entrar al dist/ del frontend con ```cd``` y ejecutar ```sudo cp * -r /var/www/html/hotelaurademallorca```
  10. Ir a la carpeta root del codigo fuente y moveremos la carpeta backend por cuestiones de claridad con ```sudo mv backend/ /var/www/html/hotelaurademallorca```.
  11. Nos movemos a esa carpeta backend con el comando ya visto y vamos a hacer: ```sudo pm2 start index.js``` y ```sudo pm2 save``` en este orden.
  12. Creamos los virtualhosts de apache con ```sudo nano /etc/apache2/sites-available/hotelaurademallorca.conf``` (para HTTP) y ```sudo nano /etc/apache2/sites-available/hotelaurademallorca-ssl.conf``` (para HTTPS) y ponemos el contenido que necesitan los dos dentro de los archivos txt en el root del codigo fuente.
  13. Activamos los virtualhosts con ```sudo a2ensite hotelaurademallorca.conf``` y ```sudo a2ensite hotelaurademallorca-ssl.conf``` y luego debemos hacer un ```sudo systemctl reload apache2```.
  14. Agregamos a nuestro archivo /etc/hosts una línea nueva con: 127.0.0.1 hotelaurademallorca.com
  15. Hacemos lo mismo que el paso 13 pero en la máquina windows pero en vez de poner esa IP, ponemos la IP que tiene la VM o en donde esté alojado la app en ese momento (ej: 192.168.1.102 hotelaurademallorca.com).
