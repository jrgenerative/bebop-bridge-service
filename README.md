
# To compile and start the client in production mode

To install the dependencies do:

```
npm install
```

Build the application:

```
npm run build:prod
```

To start the application do:

```
npm start
```

# Developing

To update bebop-bridge-shared do and explicit:
```
npm install bebop-bridge-shared
```

# Debugging with VSCode

```
npm run build:dev
```

Hit F5.

# If things are messed up

Do a 'npm cache clear', and there are global npm modules installed here:
C:\Users\jruesch\AppData\Roaming\npm\node_modules
Clean this up.

# Deprecated: Issues with Errorhandler typings

Replace thisin errorhandler index.d.ts:
  function errorHandler(options?: errorHandler.Options): express.ErrorRequestHandler;
with this
function errorHandler(options?: errorHandler.Options): express.ErrorHandler;
  
# Flightplans on Bebop

Bebop flightplan:

```
ftp://192.168.42.1/internal_000/flightplans/flightPlan.mavlink
```
```
anonymous
@anonymous
```

Somewhere might be this path required.... don't remember why/where
```
ftp://192.168.42.1/data/ftp/internal_000/flightplans/flightPlan.mavlink
```
