# Next.js + Three.js FPS Example

This project is a conversion of the Three.js FPS example to a Next.js application with TypeScript.

## Features

- First-person camera controls with mouse look
- Movement using WASD or arrow keys
- Jumping with the spacebar
- Collision detection with objects and walls
- Pointer lock API for immersive gameplay

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Play

1. Click on the "Click to play" message to start the game
2. Use WASD or arrow keys to move
3. Use the mouse to look around
4. Press the spacebar to jump
5. Press ESC to exit the game mode

## Implementation Notes

- Uses Next.js with App Router
- Implemented as a Client Component to handle browser APIs like Pointer Lock
- TypeScript for type safety
- Removed the "throw balls" functionality from the original example
- Improved collision detection
