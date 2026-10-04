import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built app also works from a subfolder or straight from disk via a static server
export default defineConfig({ plugins: [react()], base: './' })
