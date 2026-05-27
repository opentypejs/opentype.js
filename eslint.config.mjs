import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      globals: {
        console: "readonly",
        globalThis: "readonly", // this is to get eslint to stop complaining about globalThis, it's pollyfilled in the code.
        self: "readonly", // this is to get eslint to stop complaining about self, it's only used if globalThis is not available.
        // ugly platform-dependant classes and objects
        DecompressionStream: "readonly",
        Response: "readonly",
        TextDecoder: "readonly",
        SVGPathElement: "readonly",
        DOMParser: "readonly",
        Image: "readonly",
        document: "readonly",
      }
    },
    rules: {
      "indent": [
        "error",
        4,
        {
          "SwitchCase": 1
        }
      ],
      "linebreak-style": [
        "error",
        "unix"
      ],
      "quotes": [
        "error",
        "single"
      ],
      "semi": [
        "error",
        "always"
      ],
      "no-restricted-syntax": [
        "error",
        {
          "message": "For consistency, Use `for()` loops instead of `.forEach()`",
          "selector": "MemberExpression > Identifier[name=\"forEach\"]"
        }
      ]
    }
  }
]