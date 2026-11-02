# Validación reproducible del backend

## Ejecución

Desde la raíz del repositorio, en PowerShell:

```powershell
# Ajustar a la instalación local; solo cambia esta sesión de PowerShell.
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-23'
.\mvnw.cmd -version
.\mvnw.cmd -B clean verify
```

El POM declara Java 21 (`release 21`). La ejecución del 2 de noviembre de 2026
se verificó con JDK 23.0.2, Maven Wrapper 3.9.16 y Spring Boot 4.1.0.
No se ha ejecutado sobre una JVM 21. No hace falta Maven global.
La primera ejecución puede necesitar acceso a Maven Central y escritura en la
caché de Maven. Las pruebas necesitan conexiones HTTP de loopback.
`clean` elimina únicamente los resultados generados en `target`.

## Aislamiento

- Las pruebas cargan explícitamente `application-test.properties` mediante
  `spring.config.location`; no cargan `application.properties` ni
  `application-local.properties` de desarrollo.
- `@DynamicPropertySource` fija URL, driver, usuario, contraseña, dialecto y
  gestión de esquema de pruebas con prioridad sobre las variables de entorno.
- Se crea una base H2 en memoria con nombre UUID por contexto de pruebas.
  El esquema `create-drop` se limita a esa base efímera. No se usa MySQL.
- Tomcat escucha en `127.0.0.1` y un puerto aleatorio. No ocupa el puerto 8080.
  El servidor termina al finalizar el proceso de pruebas.
- Los usuarios, JWT y huertos son datos sintéticos de pruebas.
- La clave JWT de pruebas es una fixture pública y no sirve para despliegue.
- Open-Meteo no se consulta. Su URL de pruebas apunta a un destino local sin
  servicio, de modo que estas pruebas no dependen de un proveedor externo.

No ejecutar `spring-boot:run` ni el JAR sin preparar explícitamente una
configuración aislada: estos comandos no heredan las anotaciones de las pruebas
y la configuración principal activa el perfil `local`.

## Comprobaciones incluidas

`PlantPlanApplicationTests` contiene siete pruebas que pasan por la aplicación
real, sin simular repositorios ni controladores:

1. Carga del contexto y comprobación de que la conexión es H2 en memoria.
2. `GET /api/health`: HTTP 200 y contenido `status=OK`, `application=plantplan`.
3. Endpoint protegido: HTTP 401 sin JWT y con token malformado.
4. Preflight CORS desde `http://localhost:5173`, permitiendo POST y Authorization.
5. Rechazo CORS de un origen desconocido.
6. Registro, login, DTO sin contraseña, validación 400 y CRUD completo de un huerto.
7. Dos usuarios: rechazo 403 de lectura, edición y borrado del huerto ajeno,
   listado propio aislado y listado de usuarios restringido.

El CRUD se ejecuta por HTTP, con JWT emitidos por el login y persistencia JPA.
Las pruebas crean cuentas distintas y no dependen de su orden de ejecución.

## Resultado verificado

El comando `clean verify` recompiló los 80 archivos Java de producción,
ejecutó las siete pruebas sin fallos ni errores y generó el JAR ejecutable.
El arranque HTTP se verificó dentro de las pruebas; el JAR no se ha arrancado
por separado ni se ha distribuido.

Los informes se regeneran en `target/surefire-reports/`.
Los intentos iniciales restringidos por el sandbox fallaron por permisos sobre
la caché `.m2` y los sockets locales; la ejecución con esos permisos pasó.

## Dependencias y límites

Para desarrollo normal hacen falta un JDK compatible, el Wrapper y una instancia
MySQL con base de datos y usuario configurados. Para meteorología hacen falta
coordenadas y acceso HTTPS a Open-Meteo. No se han cambiado servicios, credenciales
ni datos de desarrollo. Las pruebas aisladas solo necesitan JDK, Wrapper y las
dependencias Maven, incluido H2 de alcance `test`.

Pendientes: validar con MySQL desechable, ejecutar sobre JDK 21, ampliar pruebas
de fichas/semillas/planteles/cultivos/recordatorios, expiración y manipulación de
JWT, y meteorología. H2 no demuestra compatibilidad SQL total con MySQL.
Los problemas de recordatorios y borrados con relaciones señalados en el
diagnóstico previo no se corrigen ni quedan descartados por esta batería.

La configuración principal contiene una clave JWT y el archivo local contiene
credenciales; deben externalizarse antes de distribuir un paquete o desplegar.
El empaquetado actual copia los recursos principales, incluido el archivo local
si existe. No distribuir el JAR de esta validación.
