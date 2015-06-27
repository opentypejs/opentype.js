# Contributing

## Organization of the source code

The source of opentype.js is divided into modules, located in the `src` directory.

We use [browserify](http://browserify.org/) to combine this into a single package with every release.

When creating a pull request, you **don't** need to run `npm run dist` -- we'll do that when creating a release.

## How to hack on the source

1. On our [GitHub page](https://github.com/nodebox/opentype.js), click the "Fork" button to create your personal fork
   of the opentype.js repository.

2. Clone your repository:

    git clone git://github.com/nodebox/opentype.js.git

3. Create a new branch for your feature. For example: `git checkout -b my-awesome-feature`.
    A dedicated branch for your pull request means you can develop multiple features at the same time, and ensures
    that your pull request is stable even if you later decide to develop an unrelated feature.

4. Install the development dependencies (browserify, watchify, jshint, ...):

    cd opentype.js
    npm install

5. Start the development server. This watches file changes and compiles and serves the page at http://localhost:8080/

    npm start

   Note that the compiled file ends up in the `build` folder, not the `dist` folder! The development server
   rewrites the JavaScript URL from `dist/opentype.min.js` to `build/opentype.js`.

6. Make some changes

7. Check if tests pass

    npm test

8. Commit your changes

    git add --all && git commit

9. Submit your pull request -- and thanks in advance!

## Making a distributable for yourself

If you want to create your own self-contained version of opentype.js, run

    npm dist

This compiles the source  and places `opentype.js` and `opentype.min.js` in the `dist` folder.

## How we publish a release

We use a set of [npm scripts](https://www.npmjs.org/doc/misc/npm-scripts.html) to build releases:

1. Update the version number in `package.json` and `bower.json`.
2. Add information about the new release in `RELEASES.md`.
3. Run `npm run dist` to update the files in the `dist` folder.
4. Commit (`git commit -a`) and create a tag (e.g. `git tag 1.2.1`). Push and push tags (`git push && git push --tags`).
5. Run `npm publish` to publish the package to npm. Bower updates automatically.
