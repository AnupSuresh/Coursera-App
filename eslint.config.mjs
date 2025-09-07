import globals from "globals";
import { defineConfig } from "eslint/config";
import html from "eslint-plugin-html";

export default defineConfig([
  {
    files: ["**/*.js"],
    languageOptions: { 
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { 
      globals: globals.browser
    }
  },
  {
    files: ["**/*.html"],
    plugins: {
      html: html
    },
    languageOptions: {
      globals: globals.browser
    },
    settings: {
      "html/html-extensions": [".html", ".htm"],
      "html/javascript-mime-types": ["text/javascript", "application/javascript"]
    }
  }
]);