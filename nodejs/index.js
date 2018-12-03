const Hapi = require('hapi');
const HapiAuthBasic = require('hapi-auth-basic');
const Vision = require('vision');
const Handlebars = require('handlebars');
const Inert = require('inert');
const JWT2 = require('hapi-auth-jwt2');
const JWT = require('jsonwebtoken');
const Mongoose = require('mongoose');

Mongoose.connect('mongodb://mongo:27017/hapidb', { useNewUrlParser: true }).
    then(() => console.log('MongoDB Connected'))
    .catch( err => console.log(err) );

// create Task module/model (modelName, scheme)
const Task = Mongoose.model('Task', {
    userId: String,
    created: Number,
    text: String
});
const User = Mongoose.model('User', {
    firstName: String,
    lastName: String,
    email: String,
    password: String
});

const secretKey = 'NeverShareYourSecret';
const cookie_options = {
    ttl: 365 * 24 * 60 * 60 * 1000, // expires a year from today
    encoding: 'none',    // we already used JWT to encode
    isSecure: false,     // warm & fuzzy feelings
    isHttpOnly: true,    // prevent client alteration
    clearInvalid: false, // remove invalid cookies
    strictHeader: true,  // don't allow violations of RFC 6265
    path: '/'            // set the cookie for all routes
}

// init server

const server = Hapi.Server( {
  port: 8000,
  host: '0.0.0.0',
  app: {} // with this object we can pass data to the async function and get with server.settings.app
} );

const getUserId = request => request.auth.credentials
                  ? (request.auth.credentials.id) || false
                  : false;

//----------------------- extending Handlebars ------------------

Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
        console.log(lvalue, rvalue);
    if( lvalue!=rvalue ) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});

//--------------------------------------------------


//----------------------- Handlers ------------------

const rootHandler = (request, h) => {
    return h.view('index', {
        title: 'Index - ' + request.server.version,
        errorMsg: null,
        userId: getUserId(request)
    });
};

const loginHandler = (request, h) => {
    return h.view('login', {
        title: 'Login - ' + request.server.version,
        errorMsg: null,
    });
};

const logoutHandler = (request, h) => {
    const expiration_options = JSON.parse(JSON.stringify(cookie_options));
    expiration_options['ttl'] = 1;
    return h.redirect('/').state("token", "", expiration_options);
};

const signUpHandler = (request, h) => {
    return h.view('signup', {
        title: 'SignUp - ' + request.server.version,
        errorMsg: null,
    });
};

const loginPostHandler = async (request, h) => {
    const { email = false, password = false } = request.payload,
          credentials = { email, password },
          user = await User.find({email, password});

    if (user.length != 1) {
        return h.view('login', {
            title: 'Login - ' + request.server.version,
            errorMsg: "Wrong email or password!",
        });
    }

    const token = JWT.sign({"id":user[0].id}, secretKey);
    return h.redirect('/tasks').header("authorization", token).state("token", token, cookie_options);
};


const signUpPostHandler = async (request, h) => {

  const {
        firstName = null,
        lastName = null,
        email = null,
        password = null
    } = request.payload,
    missing = (!firstName || !lastName || !email || !password);

    let emailExist = [];

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

    // if it was saved then it will be the saved user data (inc the new id)
    const saved = await newUser.save();

    if (saved) {
        return h.redirect('/login');
    }

    return h.view('signup', {
        title: 'SignUp - ' + request.server.version,
        errorMsg: "We cannot save this user, something went wrong!" ,
    });
};

const taskHandler = async (request, h) => {
    const userId = getUserId(request),
        tasks = await Task.find({"userId":userId});

    return h.view('tasks', {
        title: 'Tasks - ' + request.server.version,
        task: tasks,
        userId: userId
    }).header("authorization", request.headers.authorization);
};

const taskAddHandler = async (request, h) => {
    const userId = getUserId(request),
        task = request.payload.task;
    let newTask = new Task({
        userId: userId,
        text: task,
        created: ~~(Date.now()/1000),
    });

    const saved = await newTask.save();
    if (!saved) {
        console.log('Error task not saved');
    }
    return h.redirect('/tasks');
};

const taskDeleteHandler = async (request, h) => {
    const userId = getUserId(request),
        taskId = request.params.taskId;
    if (taskId && userId) {
        tasks = await Task.find({ _id: taskId, userId: userId });
        if (tasks.length > 0) {
            await tasks[0].remove();
        }
    }
    return h.redirect('/tasks');
};

const userHandler = async (request, h) => {
    const userId = getUserId(request),
        users = await User.find();
    return h.view('users', {
        title: 'Users - ' + request.server.version,
        task: users,
        userId: userId
    }).header("authorization", request.headers.authorization);
};

const userEditHandler = async (request, h) => {
    const userId = getUserId(request),
        user = await User.find({"_id": userId});
    if (userId != user[0],id) {
        return h.redirect('/users');
    }
    return h.view('users', {
        title: 'Users - ' + request.server.version,
        user: user[0],
        userId: userId
    }).header("authorization", request.headers.authorization);
};

const userUpdateHandler = async (request, h) => {
    // update
};

const publicHandler = async (request, h) => {
    const {dir = false, filename = false} = request.params,
        path = `public/${dir}/${filename}`;
    return (dir && filename) ? h.file(path) : null;
};

//-----------------------------------------------------

const validate = async function (decoded, request, h) {
    const user = await User.find({"_id": decoded.id}),
        isValid = !!user.length;
    (isValid) && (h.authenticated({credentials: {user: decoded.id}}));
    return { isValid };
};

const start = async () => {
    try {
        await server.register(JWT2);
        await server.register(Vision);
        await server.register(Inert);

        server.auth.strategy('jwt', 'jwt', {
          key: secretKey,
          validate: validate,
          verifyOptions: { algorithms: [ 'HS256' ] }
        });

        server.auth.default('jwt');

        server.views({
            engines: { html: Handlebars },
            relativeTo: __dirname,
            path: __dirname+'/views'
        });

        // auth modes: 'required', 'optional', 'try', auth: 'jwt', false
        server.route({ method: 'GET', path: '/', handler: rootHandler, options: { auth:{ mode: 'optional'}} });
        server.route({ method: 'GET', path: '/public/{dir}/{filename}', handler: publicHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/login', handler: loginHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/logout', handler: logoutHandler, config: { auth: 'jwt' } });
        server.route({ method: 'GET', path: '/signup', handler: signUpHandler, options: { auth: false} });
        server.route({ method: 'POST', path: '/login', handler: loginPostHandler, options: { auth: false} });
        server.route({ method: 'POST', path: '/signup', handler: signUpPostHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/tasks', handler: taskHandler, config: { auth: 'jwt' } });
        server.route({ method: 'POST', path: '/tasks', handler: taskAddHandler, config: { auth: 'jwt' } });
        server.route({ method: 'GET', path: '/tasks/delete/{taskId}', handler: taskDeleteHandler, config: { auth: 'jwt' } });
        server.route({ method: 'GET', path: '/users', handler: userHandler, config: { auth: 'jwt' }  });
        server.route({ method: 'GET', path: '/users/{{id}}', handler: userEditHandler, config: { auth: 'jwt' }  });
        server.route({ method: 'POST', path: '/users/{{id}}', handler: userUpdateHandler, config: { auth: 'jwt' }  });

        // wait till server started
        await server.start();

        console.log(`Hapi server running at ${server.info.uri}`);
    } catch (err) {
        console.log("Hapi error starting server", err);
        process.exit(1);
    }

};

start();
