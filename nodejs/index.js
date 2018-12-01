const Hapi = require('hapi');
const HapiAuthBasic = require('hapi-auth-basic');
const Bcrypt = require('bcrypt');
const Vision = require('vision');
const Handlebars = require('handlebars');
const Inert = require('inert');
const mongoose = require('mongoose');

mongoose.connect('mongodb://mongo:27017/hapidb', { useNewUrlParser: true }).
  then(() => console.log('MongoDB Connected'))
  .catch( err => console.log(err) );

// create Task module/model (modelName, scheme)
const Task = mongoose.model('Task', {text: String});
const User = mongoose.model('User', {
    firstName: String,
    lastName:String,
    email:String,
    password:String
});

// init server

const server = Hapi.Server( {
  port: 8000,
  host: '0.0.0.0',
  app: {} // with this object we can pass data to the async function and get with server.settings.app
} );

/*
  // Few word about handlers :D

  const handlerName = (request, h) {
      // h = response toolkit
      // return h.view(string, object);
      // string - file name index.html
      // object - data for handlebar
      // so response will be rendered by template engine (see below servers.views)

      // this function must be async if we use mongodb (must wait till we get the record from mongo)
      // mongo find must be await
      // else we get error because function not return anything

      // this is another example with static data
      // return h.view('tasks', {
      //    task: [
      //      {text: "task 1"},
      //      {text: "task 2"},
      //      {text: "task 3"},
      //      {text: "task 4"},
      //      {text: "task 5"},
      //    ]
      // });

      // if we want return directly a file then we need Inert
      // return h.file('./public/img/something.jpg');
      // or return h.file('./views/index.html');

      // we can return directly string too
      // return "Hello, World";

      // or we return with response and content type
      // const response = h.response('<html><head><title>hi</title></head><body>Hello</body></html>');
      // response.type("text/html");
      // return response;

      // return h.response('success')
      //    .type('text/plain')
      //    .header('X-Custom', 'some-value');

      // dynamic route & data from url, ex:  path: "/user/{name}/{id}",
      // return "Hello, "+request.params.name+"["+request.params.id+"]";

  }
*/

const rootHandler = (request, h) => {
    const userId = false
    return h.view('index', {
        title: 'Index - ' + request.server.version,
        errorMsg: null,
        userId: (userId || false)
    });
};

const loginHandler = (request, h) => {
    return h.view('login', {
        title: 'Login - ' + request.server.version,
        errorMsg: null,
    });
};

const signUpHandler = (request, h) => {
    return h.view('signup', {
        title: 'SignUp - ' + request.server.version,
        errorMsg: null,
    });
};

const loginPostHandler = (request, h) => {
    console.log('login', request.payload);
    const errorMsg = "";
    //const user = await User.find();
    //request.auth.session.set(user[0]);
    //  console.log(Object.keys(h), h.response().headers.credentials);
    return h.redirect('/tasks');
};
/*
    return h.authenticated({credentials :{user : request.payload.username}});
    return h.unauthenticated({err : "Authentication failed!!!"});
*/

const signUpPostHandler = async (request, h) => {
  const {
        firstName = null,
        lastName = null,
        email = null,
        password = null
    } = request.payload,
    missing = (!firstName || !lastName || !email || !password);

    let emailExist = [];
    // we skip email check if we dont have all required data
    if (!missing) {
        emailExist = await User.find({"email":email});
    }

    if (missing || emailExist.length > 0) {
        return h.view('signup', {
            title: 'SignUp - ' + request.server.version,
            errorMsg: missing ? "Missing information!" : "Email address already exist!",
        });
    }

    let newUser = new User({
        firstName,
        lastName,
        email,
        password
    });

    // if it was saved then saved var and newUser have same value
    // all user data (inc the new id)
    const saved = await newUser.save();

    if (saved) {
        return h.redirect('/users');
    }

    return h.view('signup', {
        title: 'SignUp - ' + request.server.version,
        errorMsg: "We cannot save this user, something went wrong!" ,
    });
};

const taskHandler = async (request, h) => {
    let tasks = await Task.find();
    return h.view('tasks', {
        task: tasks
    });
};

const validate = async (request, email, password, h) => {
    console.log('iuhi');
    if (email === 'help') {
        return { response: h.redirect('https://hapijs.com/help') };     // custom response
    }

    const user = await User.find({"email":email});
    if (user.length == 0) {
        return { credentials: null, isValid: false };
    }
    console.log('iuhi');
    const isValid = await Bcrypt.compare(password, user.password);
    const credentials = { id: user.id, name: user.name };
    console.log(credentials);
    return { isValid, credentials };
};

// start Server
const start = async () => {
    try {
        // register middlewares:
        // - HapiAuthBasic (basic auth system for hapi)
        // - Vision (template engine helper, with vison we can more template engine type)
        // - Inert (handle the static files like html/image/mp3/etc)
        await server.register(HapiAuthBasic);
        await server.register(Vision);
        await server.register(Inert);

        const scheme = function (server, options) {

            return {
                api: {
                    settings: {
                        x: 5
                    }
                },
                authenticate: function (request, h) {

                    const authorization = request.headers.authorization;
                    console.log(request.headers);
                    if (!authorization) {
                      console.log('nnn----');
                      //  throw Boom.unauthorized(null, 'Custom');

                    }
                    console.log('----');
                    return h.authenticated({ credentials: { user: 'john' } });
                }
            };
        };
        server.auth.scheme('custom', scheme);
        server.auth.strategy('default', 'custom');
        server.auth.default('default');

        //server.auth.scheme('custom', scheme);
        //server.auth.strategy('simple', 'basic', { validate });
        //server.auth.default('simple');

        // Vision help to use template engine, in our case we use Handlebars
        // path is the directory path what views will use
        server.views({
            engines: { html: Handlebars },
            relativeTo: __dirname,
            path: __dirname+'/views'
        });

        server.route({ method: 'GET', path: '/', handler: rootHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/login', handler: loginHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/signup', handler: signUpHandler, options: { auth: false} });
        server.route({ method: 'POST', path: '/login', handler: loginPostHandler, options: { auth: {mode:'try'}} });
        server.route({ method: 'POST', path: '/signup', handler: signUpPostHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/tasks', handler: taskHandler });
        server.route({ method: 'GET', path: '/users', handler: taskHandler });

        // wait till server started
        await server.start();

        console.log(`Hapi server running at ${server.info.uri}`);
    } catch (err) {
        console.log("Hapi error starting server", err);
        process.exit(1);
    }

};

start();
