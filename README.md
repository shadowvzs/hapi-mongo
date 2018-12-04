# hapi 17.8 (nodeJS 10.3) container + MongoDB 4.0 container

* you need the nodeJS and mongo containers (you can pull them)
* and files from this repo

## Important steps for run nodeJS container

* You must run download the packages with npm which was used in package.json
    * npm install

* you must have a docker network, which you can create in host machine with a single line:
    * sudo docker network create mynetwork

* you must give permission for start.sh in project root and to mongoDB folder
    * sudo chmod 777 start.sh
    * ofc also you must have the volume folders

* create entry point or launch manually the nodeJS app (ex. manually)
    * cd /home/project
    * node index
    * (optional: you can use nodemon for run hapi server, if you are in project folder, type "nodemon")


## How it work:

* we have 2 container:
    * only nodejs (and we have shared folder with project files)
        * we need use volume, so our external folder inject into container, so we use ide outside but code will be executed inside, like shared folder
    * only mongoDB (it was pulled from docker repo)
        * we need volume/shared folder for save the data into host machine folder
            * keep in mind, the host folder will replace the folder from image when you run container !!
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
* use **ssh** for check files or transfer between host & docker container
    * **Note:** if you want keep file permanent in your container then you have more option:
        * sudo docker commit *containerHash* *imageName* - this create a new image from container current state
        * use **volume** (-v) when you run your container and file should be stored in host machine
* copy something out from container:
    * Docker container:
        * passwd root = change the password for root
        * apt-get update = update the repositories
        * apt-get install nano = my favorite text editor
        * apt-get install openssh-server = install ssh server
        * nano /etc/ssh/sshd_config = open ssh config file for editing
            * change value at *PermitRootLogin* line to yes
            * save
        * service ssh restart = restart ssh server so it will use the new config
        * ip addr show = check your ip (at me useally 172.17.0.2 but not static)
    * Host machine:
        * install **winSCP** - https://winscp.net/eng/download.php *(100% compatibile with wine - linux users)*
        * connect to docker:
            * host: ip what you got from *ip addr show*
            * type: *sftp* & port: *22*
            * username: *root*
            * password: what you setted with *passwd root*
    * when you are done then just exit from container, so it will be cleanup changes on container at next container run



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
* use hapidb - create new /select database (name: hapidb)
* db.createCollection('tasks'); = create collection (name tasks) in current db (hapidb)
* db.tasks.insert({text:'Task 1'}); = insert a new object into the colllection(tasks)
* db.tasks.insertMany([{text:'Task 1'},{text:'Task 2'}]); = insert more document into collection
* db.tasks.updateOne({ "favorites.artist": "Picasso" },{$set: { "favorites.food": "pie", type: 3 },$currentDate: { lastModified: true }}) = update the 1st (condition, set which will be updated,update lastModified field)
* db.task.update() = same than above, update the 1st method
* db.task.updateMany() = same like updateOne except this update every record
* db.collection.replaceOne({ name: "abc" },{ name: "amy", age: 34, type: 2}) = replce first document where name is "abc"
* db.tasks.find() = list records in tasks collection
* db.tasks.find(idHash) = find that id in collection
* db.tasks.remove( { status: "D" }, 1) = remove 1 record where status is "D"
* db.tasks.remove( { status: "D" } ) = remove every record where status is "D"
* db.tasks.remove( {} ) = remove every document from collection
* db.tasks.deleteOne( { status: "D" } ) = delete first record where status is "D"
* db.tasks.deleteMany( { status: "D" } ) = delete every record where status is "D"
* db.tasks.deleteMany({}) = delete every document from collection
* db.tasks.save() = save current document object
* db.tasks.drop() = remove the collection (tasks)
* other usefull stuff: findAndModify, findOneAndReplace(), findOneAndUpdate(), Geospatial Queries, copyTo, cloneCollection(), cloneDatabase()..........



## Helpful link

*few thing outdated in that guide like happi connection, handle which use mongodb etc but could be a good start*

* https://www.youtube.com/watch?v=2lprC0yYeFw
* https://www.npmjs.com/package/hapi-auth-jwt2
* https://github.com/hapijs/hapi-auth-cookie
* https://medium.freecodecamp.org/how-to-setup-a-powerful-api-with-nodejs-graphql-mongodb-hapi-and-swagger-e251ac189649
* https://docs.mongodb.com/v3.2/reference/sql-comparison/
* https://docs.mongodb.com/v3.2/tutorial/update-documents/
* https://www.tutorialspoint.com/mongodb/mongodb_environment.htm
* https://mongoosejs.com/
* https://success.docker.com/article/how-can-i-access-mongodb-container-from-another-container
* https://github.com/hapijs/vision
* https://hapijs.com/tutorials/serving-files
