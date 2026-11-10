import next from "eslint-config-next";

/** Flat config. Inclui limite de complexidade ciclomatica (eixo de QA). */
export default [
  ...(Array.isArray(next) ? next : [next]),
  {
    rules: {
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-lines-per-function": ["warn", 80],
      // react/display-name crasha no eslint-plugin-react em node 24 (getFilename);
      // baixo valor + o build do Next já cobre — desligada p/ o lint não quebrar.
      "react/display-name": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
];
