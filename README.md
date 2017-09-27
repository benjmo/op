# op
Online pictionary

## Starting the server
1. Install Node.js
2. Run `npm install`
3. Run `npm start`
4. Server is accessible on `localhost:3000`

If you modify the server code, you'll need to stop and restart the server for changes to take effect.

## Testing
1. Run `npm test` (Server does not need to be running)

Don't forget to `npm install` beforehand so mocha/chai are installed

## How to access op
* `localhost:3000/play/ID` uses the file rendered by the pug templates
* `localhost:3000/index.html?game=ID` uses the html file in static/