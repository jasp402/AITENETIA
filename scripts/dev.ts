import { spawn } from "bun";
import { execSync } from "child_process";

console.log("🚀 Iniciando AI Tenet IA Ecosystem...");

function killPort(port: number) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = stdout.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 4) {
        const address = parts[1];
        if (address && (address.endsWith(`:${port}`) || address === '[::]:' + port)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== 'PID') {
            console.log(`⚠️ Liberando puerto ${port} (PID: ${pid})...`);
            execSync(`taskkill /F /PID ${pid}`);
          }
        }
      }
    }
  } catch (e) {
    // No process found on port or error
  }
}

// Limpiar puertos antes de iniciar
killPort(4000);
killPort(4001);

// 1. Iniciar Backend (Bun) en el puerto 4001 (definido en .env)
const backend = spawn(["bun", "run", "index.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});

// 2. Iniciar Frontend (Next.js en el puerto 4000)
const frontend = spawn(["npm", "run", "dev"], {
  cwd: "./app",
  stdout: "inherit",
  stderr: "inherit",
});

console.log("✅ Backend configurado en puerto 4001");
console.log("✅ Frontend configurado en puerto 4000 (http://localhost:4000)");

// Manejar cierre los procesos al salir
process.on("SIGINT", () => {
  console.log("\n🛑 Cerrando ecosistema...");
  backend.kill();
  frontend.kill();
  process.exit();
});
