# Diagramas de PlantPlan · Primeira entrega

## 1. Diagrama de clases UML

O diagrama representa as sete entidades persistentes de PlantPlan, os seus atributos cos tipos Java e as multiplicidades definidas en JPA. Cada horta e cada ficha de cultivo pertencen a unha persoa usuaria. As fichas agrupan sementes, rexistros de sementeiros e cultivos, e cada cultivo está asociado tamén a unha horta. Cada recordatorio pertence a unha persoa usuaria e pode vincularse de forma opcional a outros elementos do dominio.

[Diagrama en SVG](01-clases.svg) · [Fonte Mermaid](01-clases.mmd)

As entidades implementan construtores e métodos de acceso aos atributos. A lóxica de negocio reside nos servizos, polo que as caixas do diagrama só amosan atributos. As catro enumeracións propias amósanse como tipos auxiliares. As asociacións bidireccionais corresponden aos pares `@OneToMany(mappedBy = ...)` e `@ManyToOne`. Nas seis coleccións bidireccionais están configurados `CascadeType.ALL` e `orphanRemoval = true` a nivel de JPA.

## 2. Diagrama de casos de uso UML

O diagrama agrupa as funcións que ofrece a API actual en catro áreas. A xeneralización UML indica que a persoa administradora pode realizar as mesmas operacións sobre os seus recursos que unha persoa usuaria e, ademais, listar as contas rexistradas. Esta relación describe os permisos efectivos da API. Spring Security asigna unha única autoridade por conta.

[Diagrama en SVG](02-casos-de-uso.svg) · [Fonte PlantUML](02-casos-de-uso.puml)

O SVG está preparado para unha páxina A4 en vertical. Para editar ou volver xerar o diagrama, abre o ficheiro `.puml` completo nun visor PlantUML.

| Área | Alcance implementado |
| --- | --- |
| Acceso | Rexistrarse cunha conta de rol `USER` e iniciar sesión mediante credenciais para obter un JWT. |
| Conta | Consultar e editar o perfil propio e solicitar a eliminación da conta. O listado reservado a `ADMIN` devolve o identificador, o nome, o correo e o rol das contas rexistradas. As operacións sobre o perfil seguen limitadas á conta propia. |
| Planificación da horta | Crear, consultar, editar e eliminar hortas, fichas de cultivo, cultivos, sementes e rexistros de sementeiros propios. Estes últimos corresponden a `Seedling` e recollen cantidades e datas de sementeira e transplante. Os cultivos pódense consultar tamén por horta ou por ficha, e as sementes e os rexistros de sementeiros, por ficha. |
| Seguimento | Consultar os recordatorios propios por intervalo de datas ou en detalle e marcar un como completado. Para unha horta propia con coordenadas, consultar o tempo actual e a previsión de Open-Meteo, xunto cunha suxestión de rega calculada por PlantPlan. |

O frontend de React presenta un panel de demostración con sementes, sementeiros, hortas e recordatorios de exemplo. O menú e o selector de escenarios funcionan localmente. O diagrama recolle as funcións da API que se poderán integrar na interface.

## 3. Diagrama entidade–relación

O diagrama representa as sete táboas derivadas do modelo JPA para MySQL, as súas columnas, as claves primarias e foráneas e as cardinalidades. Todas as táboas teñen un `id` autoincremental. O correo electrónico de `users` ten unha restrición de unicidade. En `reminders`, `user_id` é obrigatoria e as cinco referencias restantes admiten valores nulos.

[Fonte Mermaid](03-entidade-relacion.mmd)

O esquema obtívose do mapeo JPA e contrastouse co SQL xerado por Hibernate para o dialecto de MySQL sen conexión. O servidor local rexeitou a conexión de só lectura, polo que queda pendente o contraste co esquema da instancia real. `PK` identifica a clave primaria, `FK` a clave foránea e `UK` a clave única. Cada clave foránea referencia a columna `id` da táboa correspondente. As liñas descontinuas indican relacións nas que a clave foránea queda fóra da clave primaria.

## Funcionalidades pendentes

- Conectar o frontend á API e habilitar o rexistro, o inicio e peche de sesión, o perfil, as pantallas de xestión e as accións sobre recordatorios. O peche de sesión figura como acción pendente na interface e a API actual expón rexistro e inicio de sesión.
- Conectar a pantalla de sementeira aos rexistros reais. As etapas de xerminación que aparecen no panel son ilustrativas.
- Incorporar un catálogo inicial de cultivos comúns. As fichas actuais son propias de cada persoa usuaria.
- Incorporar un fluxo de asignación do rol `ADMIN` e resolver a eliminación de contas con recordatorios asociados.
- Desenvolver PlantIA nunha fase posterior, fóra da primeira versión.

As accións pendentes no frontend poden consultarse no [README da interface](../../frontend/README.md). O catálogo, a xestión do rol e a eliminación con recordatorios están recollidos na [documentación técnica](../../DOCUMENTACION_TECNICA.md). PlantIA figura no [seguimento de tarefas](../../TAREAS.md).
