Based on https://domenicosibilio.medium.com/rsocket-with-spring-boot-js-zero-to-hero-ef63128f973d

Needs npm and browserify to build. Once built, does not need npm. Basically we need to deal with JS with dependencies.

You run the following commands:
- Go to src\main\resources\static
- Run "npm install"
- Run "browserify index.js > websocket.js"

The final result is a websocket.js, which is what can be embedded in the jar. 