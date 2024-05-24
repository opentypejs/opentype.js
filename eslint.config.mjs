import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      globals: {
        console: "readonly",
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