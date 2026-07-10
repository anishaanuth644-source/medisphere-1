import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          charts: ["recharts"],
          ui: ["lucide-react"],
          pdf: ["jspdf", "jspdf-autotable"],
          csv: ["papaparse"],
        },
      },
    },
  },
});
