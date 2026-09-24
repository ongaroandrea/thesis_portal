import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				// The bundled Bootstrap theme still uses APIs that Dart Sass has
				// deprecated but continues to support. Keep development output useful
				// until Bootstrap completes its module-system migration.
				quietDeps: true,
				silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
			}
		}
	}
});
