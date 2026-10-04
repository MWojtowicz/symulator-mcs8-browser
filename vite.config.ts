import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Single self-contained index.html (JS, CSS and images inlined): opens straight from disk, no server needed.
export default defineConfig({ plugins: [react(), viteSingleFile()], base: './' })
