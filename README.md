# Quarzen's Domino

Una aplicacion web progresiva (PWA) de domino donde un jugador humano compite contra 3 oponentes controlados por IA alrededor de una mesa virtual. Desarrollado con Phaser 3, TypeScript y Vite.

## Caracteristicas

- Juego de domino estandar doble-seis (28 fichas) con colocacion mediante arrastrar y soltar
- Tres niveles de dificultad de IA: Facil (te ayuda), Aleatorio (neutral), Dificil (te bloquea)
- Sistema de temas basado en JSON para intercambiar disenos de fichas, sonidos y esquemas de colores
- Soporte PWA para juego sin conexion e instalacion en pantalla de inicio
- Animaciones fluidas con objetivo de 60fps
- Disenado para movil con soporte completo de escritorio

## Inicio Rapido

```bash
# Opcion 1: Usar init.sh
chmod +x init.sh
./init.sh

# Opcion 2: Manual
npm install
npm run dev
```

Luego abre http://localhost:5173 en tu navegador.

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Iniciar servidor de desarrollo Vite (puerto 5173)
npm run build        # Compilacion para produccion
npm run preview      # Vista previa de la compilacion de produccion
```

## Despliegue

El juego se despliega mediante Docker + Cloudflare Tunnel en **domino.5ps.tech**.

**Credenciales de demo:**

| Campo    | Valor      |
|----------|------------|
| Usuario  | `demo`     |
| Contrasena | `test1234` |

### Comandos de despliegue

```bash
# Iniciar el despliegue (compila y sirve en el puerto 7847)
cd deploy && docker compose up -d

# Establecer credenciales personalizadas
./deploy/setup.sh miusuario micontrasena

# Detener el despliegue
cd deploy && docker compose down
```

Apunta tu tunel de Cloudflare `domino.5ps.tech` a `http://localhost:7847`.

## Estructura del Proyecto

```
src/
  main.ts                 # Configuracion y arranque de Phaser
  models/                 # Modelos de datos (Domino, GameState, BoardState, PlayerHand)
  managers/               # Gestores del juego (DeckManager, ThemeManager, AudioManager, SlotHelper, ScoreManager)
  scenes/                 # Escenas de Phaser (MenuScene, GameScene)
  ai/                     # Estrategias de IA (Facil, Aleatorio, Dificil)
  utils/                  # Utilidades (EventBus)
public/
  assets/themes/classic/  # Tema por defecto (fichas, fondos, sonidos, theme.json)
```

## Stack Tecnologico

- **Motor:** Phaser 3.80+
- **Lenguaje:** TypeScript 5.x (modo estricto)
- **Empaquetador:** Vite 6.x
- **Estado:** Datos de escena Phaser + clase central GameState
