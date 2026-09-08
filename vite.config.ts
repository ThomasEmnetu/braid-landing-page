import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative assets also work on a GitHub Pages repository subpath.
  base: './',
})
