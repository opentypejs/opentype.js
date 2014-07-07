# Contributing

## How to Submit a Pull Request

1. Click the "Fork" button to create your personal fork of the opentype.js repository.
2. In the terminal, run `npm install` to install the dependencies needed for development.
3. Create a new branch for your feature. For example: `git checkout -b my-awesome-feature`. A dedicated branch for your pull request means you can develop multiple features at the same time, and ensures that your pull request is stable even if you later decide to develop an unrelated feature.
4. The `opentype.js` and `opentype.min.js` files are built from source files in the `src` directory. _Do not edit `opentype.js` directly._ Instead, edit the source files, and then run `make` to build the generated files.
5. Use `make test` to run tests and verify your changes.
7. Submit your pull request -- and thanks in advance!
