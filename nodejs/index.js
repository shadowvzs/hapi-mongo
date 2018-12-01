const Hapi = require('hapi');
const Vision = require('vision');
const Handlebars = require('handlebars');
const Inert = require('inert');
const mongoose = require('mongoose');

mongoose.connect('mongodb://mongo:27017/hapidb', { useNewUrlParser: true }).
  then(() => console.log('MongoDB Connected'))
  .catch( err => console.log(err) );

// create Task module/model (modelName, scheme)
const Task = mongoose.model('Task', {text: String});

// init server

const server = Hapi.Server( {
  port: 8000,
  host: '0.0.0.0',
  app: {} //with this object we can pass data to the async function and get with server.settings.app
} );


const rootHandler = (request, h) => {
    // h.view(string, object)
    // string - file name index.html
    // object - data for handlebar
    return h.view('index', {
        title: 'views/index.html | Hapi ' + request.server.version,
        message: 'Hello Handlebars!'
    });
};

const taskHandler = async (request, h) => {
    // h.view(string, object)
    // string - file name index.html
    // object - data for handlebar

    // this is async (must wait till we get the record from mongo)
    // so our handle must be async and mongo find must be await
    // else we get error because function not return anything
    let tasks = await Task.find();
    return h.view('tasks', {
        task: tasks
    });
    /*
    // this is another example with static data, for this don't need async/await
    return h.view('tasks', {
        task: [
          {text: "task 1"},
          {text: "task 2"},
          {text: "task 3"},
          {text: "task 4"},
          {text: "task 5"},
        ]
    });
    */
};

// start Server
const start = async () => {
  try {
    // register middlewares:
    // - Vision (template engine helper, with vison we can more template engine type)
    // - Inert (handle the static files like html/image/mp3/etc)
    await server.register(Vision);
    await server.register(Inert);

      // Vision help to use template engine, in our case we use Handlebars
      // path is the directory where we store the html files for our views
      server.views({
          engines: { html: Handlebars },
          relativeTo: __dirname,
          path: __dirname+'/views'
      });

      server.route({ method: 'GET', path: '/', handler: rootHandler });
      server.route({ method: 'GET', path: '/tasks', handler: taskHandler });

    /*
    // another way to route but you can use also plugin and declare routes in another file
    server.route([
      {
        method: "GET",
        path: "/api/hello",
        handler: async (request, h) => {
          return "Hello, World";
        }
      },
      {
        method: "GET",
        path: "/",
        handler: async (request, h) => {
          return h.file('./public/index.html');
        }
      },
      {
        method: "GET",
        path: "/hello",
        handler: async (request, h) => {
          const response = h.response('<html><head><title>hi</title></head><body>Hello</body></html>');
          response.type("text/html");
          console.log('new request');
          return response;
        }
      },
      {
        method: "GET",
        path: "/user/{name}/{id}",
        handler: async (request, h) => {
          return "Hello, "+request.params.name+"["+request.params.id+"]";
        }
      }
    ]);
    */
    
    // wait till server started
    await server.start();

    console.log(`Hapi server running at ${server.info.uri}`);
  } catch (err) {
    console.log("Hapi error starting server", err);
  }

};

start();
