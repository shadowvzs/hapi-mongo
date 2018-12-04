const Hapi = require('hapi');
const Vision = require('vision');
const Handlebars = require('handlebars');
const Inert = require('inert');
const JWT2 = require('hapi-auth-jwt2');
const JWT = require('jsonwebtoken');
const Mongoose = require('mongoose');
const mongo = {
    host: "mongo",
    port: "27017",
    db: "hapidb",
    options: { useNewUrlParser: true }
};
const hapi = {
    host: "0.0.0.0",
    port: 8000
}

Mongoose.connect(`mongodb://${mongo.host}:${mongo.port}/${mongo.db}`, mongo.options).
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
    ttl: 365 * 24 * 60 * 60 * 1000,
    encoding: 'none',
    isSecure: false,
    isHttpOnly: true,
    clearInvalid: false,
    strictHeader: true,
    path: '/'
}

const server = Hapi.Server( {
    host: hapi.host,
    port: hapi.port,
    app: {}
} );

const getUserId = request => request.auth.credentials
                  ? (request.auth.credentials.id) || false
                  : false;

//----------------------- extending Handlebars ------------------

Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
    if( lvalue!=rvalue ) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});

//----------------------- Route Handlers ------------------

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
    if (userId != user[0].id) {
        return h.redirect('/users');
    }
    return h.view('userEdit', {
        title: 'Users - ' + request.server.version,
        user: user[0],
        userId: userId
    }).header("authorization", request.headers.authorization);
};

const userUpdateHandler = async (request, h) => {
    const userId = getUserId(request),
        pl = request.payload;
    if (userId == request.params.id) {
        const saved = await User.updateMany(
            {_id:userId},
            pl,
            {new: true}
        )
        if (!saved.ok) {
            console.log("Error, user not updated")
        }
    }
    return h.redirect('/users');
};

const publicHandler = async (request, h) => {
    const {dir = false, filename = false} = request.params,
        path = `public/${dir}/${filename}`;
    return (dir && filename) ? h.file(path) : null;
};

//------------------- Validator (JWT) on routes ----------------------------------

const validate = async function (decoded, request, h) {
    const user = await User.find({"_id": decoded.id}),
        isValid = !!user.length;
    (isValid) && (h.authenticated({credentials: {user: decoded.id}}));
    return { isValid };
};

//------------------- Start/Init function ----------------------------------

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

        //--------------------------- Routes --------------------------
        server.route({ method: 'GET', path: '/', handler: rootHandler, options: { auth:{ mode: 'optional'}} });
        server.route({ method: 'GET', path: '/public/{dir}/{filename}', handler: publicHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/login', handler: loginHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/logout', handler: logoutHandler, config: { auth:{ mode: 'try'}}  });
        server.route({ method: 'GET', path: '/signup', handler: signUpHandler, options: { auth: false} });
        server.route({ method: 'POST', path: '/login', handler: loginPostHandler, options: { auth: false} });
        server.route({ method: 'POST', path: '/signup', handler: signUpPostHandler, options: { auth: false} });
        server.route({ method: 'GET', path: '/tasks', handler: taskHandler, config: { auth: 'jwt' } });
        server.route({ method: 'POST', path: '/tasks', handler: taskAddHandler, config: { auth: 'jwt' } });
        server.route({ method: 'GET', path: '/tasks/delete/{taskId}', handler: taskDeleteHandler, config: { auth: 'jwt' } });
        server.route({ method: 'GET', path: '/users', handler: userHandler, config: { auth: 'jwt' }  });
        server.route({ method: 'GET', path: '/user/{id}', handler: userEditHandler, config: { auth: 'jwt' }  });
        server.route({ method: 'POST', path: '/user/{id}', handler: userUpdateHandler, config: { auth: 'jwt' }  });

        // wait till server started
        await server.start();

        console.log(`Hapi server running at ${server.info.uri}`);
    } catch (err) {
        console.log("Hapi error starting server", err);
        process.exit(1);
    }

};

start();
