# hapi (nodeJS) container + MongoDB container

## Important steps 

* You must run download the packages with npm which was used in package.json
    * npm install

* you must have a docker network, which you can create in host machine with a single line:
    * sudo docker network create mynetwork

* you must give permission for start.sh in project root and to mongoDB folder
    * sudo chmod 777 start.sh

* create entry point or launch manually the nodeJS app (ex. manually)
    * cd /home/project
    * nodemon or node index


## How it work:

* we have 2 container:
    * only nodejs (and we have shared folder with project files)
        * we need use volume, so our external folder inject into container, so we use ide outside but code will be executed inside, like shared folder
    * only mongoDB (it was pulled from docker repo)
        * we need volume/shared folder for save the data into host machine folder
        * somehow not let me declare the entrypoint directly so i created a bashfile, mounted and used the .sh like entrypoint
        * first time you need create db, collection, something data for test
* the 2 container must communicate with eachother, this have more way but we use same network
    * it is simliar like the lan, the containers can see eachother with different ip
    * bonus is the container alias which is fixed, so we don't need to know the ip (which not static)
        * example from nodejs you can run this: ping mongo
    * so nodejs via mongoose module can access the mongodb from mongo container
        * ofc mongodb must run with bind all ip param:
             * ex.: /usr/bin/mongod --bind_ip_all


## Other helpful information

### Docker
* ip addr show = need package: iproute
* ping x.y.z.v = need package: iputils-ping
* sudo docker exec -it mongo /bin/bash = enter into deattached container and use terminal
* /usr/bin/mongo = enter to mongo console/terminal

### Hapi - NodeJS
* **inert**: used for return static files from filesystem
* **vision**: let us to use template engines easier at response
* **handlebar**: javascript based template engine
* **mongoose**: elegant MongoDB object modeling for nodeJS

### MongoDB
* mongo - this start the mongo console where you can type commands for mongo, located in usr/bin
* mongos - mongodb shard, is a routing service for MongoDB shard configurations, located in usr/bin
* mongod - this start the database in image, located in usr/bin
* show dbs - obvious :D
* user hapibb - create new database with hapidb name
* db.createCollection('tasks'); = create collection (name tasks) in current db (hapidb)
* db.tasks.insert({text:'Task 1'}); = insert a new object into the colllection(tasks)
* db.tasks.find() = list records in tasks collection
* db.tasks.find(idHash) = find that id in collection


## Helpful link

*few thing outdated in that guide like happi connection, handle which use mongodb etc but could be a good start*

* https://medium.freecodecamp.org/how-to-setup-a-powerful-api-with-nodejs-graphql-mongodb-hapi-and-swagger-e251ac189649
* https://www.tutorialspoint.com/mongodb/mongodb_environment.htm

