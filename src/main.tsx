import { createRoot } from 'react-dom/client'
import { Analytics } from "@vercel/analytics/react"
import App from './App.tsx'
import './index.css'

// Chunk lazy (import dinâmico) de uma build antiga já removida do servidor
// depois de um novo deploy — o browser recebe o index.html (HTML) em vez do
// JS pedido e falha com "Expected a JavaScript-or-Wasm module". O Vite emite
// este evento nesse caso; um único reload busca o index.html actual, com os
// hashes de chunk correctos. Guarda de sessão evita loop se o erro persistir
// por outra razão.
window.addEventListener('vite:preloadError', () => {
  const key = 'vite-reload-on-preload-error';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);
