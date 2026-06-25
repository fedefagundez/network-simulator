# Network Simulator

Simulador de red interactivo diseñado para enseñar a niños cómo funcionan las redes informáticas de forma simple y clara.

## ¿Qué es?

Una aplicación web que permite visualizar una red de computadoras con nodos y conexiones. Los usuarios pueden crear, modificar y explorar redes, y ver cómo viajan los paquetes de datos entre dispositivos.

## ¿Para quién está pensado?

Para niños y jóvenes que están empezando a aprender sobre redes. La interfaz es visual e intuitiva, con colores, sonidos y animaciones que hacen el aprendizaje más divertido.

## Cómo usar

### Abrir la aplicación

Se puede utilizar desde el siguiente [enlace](https://fedefagundez.github.io/network-simulator/index.html).

### Herramientas

| Herramienta | Qué hace |
|-------------|----------|
| **Mover** | Arrastrá los nodos para reposicionarlos.|
| **Agregar** | Hacé click en un espacio vacío para crear un nodo nuevo. |
| **Eliminar** | Hacé click en un nodo para borrarlo y todas sus conexiones. |
| **Emisor (TX)** | Hacé click en un nodo para designarlo como origen del mensaje. |
| **Receptor (RX)** | Hacé click en un nodo para designarlo como destino del mensaje. |
| **On/Off** | Hacé click en un nodo para apagarlo o encenderlo. Los nodos apagados bloquean el paso. |
| **Conectar** | Hacé click en un nodo, y luego en otro para crear una conexión entre ellos. |
| **Desconectar** | Hacé click sobre una línea de conexión para eliminarla. |

### Navegación

- **Pan (mover vista):** Click y arrastrá en el fondo del canvas.
- **Zoom:** Usá la rueda del mouse para acercar o alejar.

### Enviar un paquete

1. Designá un nodo como **Emisor (TX)** y otro como **Receptor (RX)**.
2. Hacé click en el botón **Enviar**.
3. Observá cómo el paquete viaja por la red hasta llegar a su destino.

### Sonidos

La aplicación reproduce sonidos para cada acción: agregar nodos, conectar, enviar paquetes, entregar mensajes, y errores. Los sonidos se activan automáticamente con la primera interacción.

## Estructura del proyecto

```
network-simulator/
├── index.html    ← Estructura HTML
├── style.css     ← Estilos visuales
├── script.js     ← Lógica de la aplicación
└── sounds.js     ← Módulo de audio
```

## Tecnologías

- HTML5 Canvas para el dibujo
- CSS3 con variables y soporte modo oscuro
- JavaScript vanilla (sin dependencias)
- Web Audio API para sonidos programáticos
