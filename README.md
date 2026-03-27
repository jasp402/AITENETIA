# Bun AI API

Este proyecto es una API construida con [Bun](https://bun.sh) que integra servicios de IA como Groq y Cerebras.

## Requisitos Previos

El único requisito principal para ejecutar este proyecto es tener **Bun** instalado en tu sistema.

### ¿No tienes Bun instalado?

Si aún no tienes Bun, puedes instalarlo siguiendo las instrucciones oficiales o ejecutando el siguiente comando en tu terminal (para macOS, Linux y WSL):

```bash
curl -fsSL https://bun.sh/install | bash
```

Para usuarios de Windows, se recomienda usar WSL o seguir las instrucciones específicas en su página web.

👉 [Visita la página oficial de Bun para más detalles](https://bun.sh)

## Instalación Paso a Paso

Sigue estos pasos desde la raíz del proyecto.

### 1. Instalar Bun

Este proyecto necesita **Bun** para inicializar la base de datos y ejecutar el backend.

### 2. Instalar dependencias

Ejecuta:

```bash
npm install
```

Ese paso ahora dispara un `postinstall` que:

- instala dependencias del frontend en `app/`
- crea `.env` a partir de `.env.example` si todavía no existe
- inicializa la base de datos SQLite si `bun` está disponible

### 3. Configurar variables de entorno

Edita el archivo `.env` y añade tus claves:

```env
PORT=3000
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=csk_...
```

Si `.env` no existe todavía, `npm install` lo crea automáticamente a partir de `.env.example`.

### 4. Ejecutar el setup del proyecto

Para ejecutar el flujo completo de instalación y validación:

```bash
npm run setup
```

Si además quieres que levante backend + frontend y abra el navegador automáticamente al terminar:

```bash
npm run setup:start
```

### 5. Levantar el proyecto

```bash
npm run dev
```

Si quieres abrir el navegador automáticamente:

```bash
npm run dev:open
```

Esto iniciará:
- Backend en `http://localhost:4001`
- Frontend en `http://localhost:4000`

### 6. Reinicializar la base de datos si hace falta

```bash
npm run init-db
```

## Uso del CLI

El proyecto incluye un CLI local para instalación, arranque y tareas de soporte.

Puedes usarlo así:

```bash
node scripts/cli.mjs --help
```

O como binario del proyecto:

```bash
npx aitenetia --help
```

### Comandos disponibles

- `postinstall`: se ejecuta automáticamente al hacer `npm install`. Prepara `app/`, crea `.env` si falta e intenta inicializar la base de datos.
- `install`: corre el setup completo de forma manual cuando quieres repetir la instalación o preparar una máquina nueva.
- `launch`: arranca backend y frontend juntos.
- `init-db`: reinicializa el esquema SQLite y el seed de agentes.

### Ejemplos de uso

```bash
node scripts/cli.mjs install
node scripts/cli.mjs install --start
node scripts/cli.mjs install --start --open
node scripts/cli.mjs launch
node scripts/cli.mjs launch --open
node scripts/cli.mjs init-db
```

### Equivalencias con scripts npm

```bash
npm run setup          # Igual a: node scripts/cli.mjs install
npm run setup:start    # Igual a: node scripts/cli.mjs install --start --open
npm run dev            # Igual a: node scripts/cli.mjs launch
npm run dev:open       # Igual a: node scripts/cli.mjs launch --open
npm run init-db        # Igual a: node scripts/cli.mjs init-db
```

## Gestión de Servicios de IA

Este proyecto utiliza un sistema de **carga dinámica** para los servicios de IA. Esto significa que no necesitas modificar el código principal para activar, desactivar o añadir nuevos servicios.

### 1. Activar y Desactivar Servicios

La activación de los servicios es **automática** y está basada únicamente en la presencia de sus variables de entorno en el archivo `.env`.

*   **Para activar un servicio:** Simplemente añade su API Key correspondiente al archivo `.env`.
*   **Para desactivar un servicio:** Elimina o comenta (añadiendo `#` al principio) la línea de su API Key en el archivo `.env`.

### 2. Servicios Disponibles

A continuación se muestra la lista de servicios soportados actualmente y la variable de entorno necesaria para activarlos:

| Servicio | Variable de Entorno |
| :--- | :--- |
| **Groq** | `GROQ_API_KEY` |
| **Cerebras** | `CEREBRAS_API_KEY` |

### 3. Cómo añadir un nuevo servicio

Gracias al patrón Factory implementado, añadir un nuevo proveedor de IA es muy sencillo:

1.  Crea un nuevo archivo TypeScript (ej: `deepseek.ts`) en la carpeta `services/`.
2.  Implementa y exporta un objeto que cumpla con la interfaz de fábrica. No necesitas registrarlo manualmente en ningún otro sitio.

Ejemplo de estructura de un nuevo servicio:

```typescript
import type { AIService, ChatMessage } from '../types';

// El objeto exportado PUEDE tener cualquier nombre, pero debe tener 'isEnabled' y 'create'
export const deepseekFactory = {
  // Define cuándo se debe activar este servicio
  isEnabled: () => !!process.env.DEEPSEEK_API_KEY,

  // Crea y devuelve la instancia del servicio
  create: (): AIService => {
    return {
      name: 'DeepSeek',
      async chat(messages: ChatMessage[]) {
        // ... lógica de llamada a la API ...
        // Debe devolver un AsyncIterable<string>
      }
    }
  }
}
```

El sistema detectará automáticamente el nuevo archivo, comprobará `isEnabled` y, si devuelve `true`, añadirá el servicio a la rotación.
