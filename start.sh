#!/bin/bash

# settings for all container
WORK_DIR="/home/shadowvzs/projects/hapi-mongo/"
DOCKER_NETWORK="mynetwork"

# settings for nodeJS container
EXT_NODE_DIR="${WORK_DIR}nodejs"
INT_NODE_DIR="/home/project"
NODE_CONTAINER_NAME="nodejs"
NODE_IMAGE="nodejs:1"
NODE_PORT="8000"
NODE_ENTRY_POINT="/bin/bash"

# settings for MongoDB container
EXT_DB_DIR="${WORK_DIR}mongoDB/data"
INT_DB_DIR="/data"
EXT_DB_SHELL="${WORK_DIR}mongoDB/start.sh"
INT_DB_SHELL="/home/mongo/start.sh"
DB_CONTAINER_NAME="mongo"
DB_IMAGE="mongo:latest"
DB_PORT="27017"

clear
echo "start mongoDB container..."
sudo docker run --rm -v ${EXT_DB_DIR}:${INT_DB_DIR} -v ${EXT_DB_SHELL}:${INT_DB_SHELL} -d -it -p ${DB_PORT}:${DB_PORT} --network ${DOCKER_NETWORK} --name ${DB_CONTAINER_NAME} ${DB_IMAGE} ${INT_DB_SHELL}
echo "start nodeJS container..."
sudo docker run --rm -v ${EXT_NODE_DIR}:${INT_NODE_DIR} -it -p ${NODE_PORT}:${NODE_PORT} --network ${DOCKER_NETWORK} --name ${NODE_CONTAINER_NAME} ${NODE_IMAGE} ${NODE_ENTRY_POINT}
echo "kill mongoDB container..."
sudo docker kill mongo

# run .... IMAGE_NAME = run container which based on image, if not exist then automatically pulled from docker repo
# ENTRY_POINT = point which keep alive the container, ex. "/bin/bash", if you exit then contained closed, could be example runable process or shell file too
# -it = interactive-text mode
# -v EXT_NODE_DIR:INT_NODE_DIR = mount host directory into docker (shared folder - inside/outside), source or host:target or container dir
# -p EXT_PORT:INT_PORT = portfoward, host port:internal docker port
# -d = deattached mode, container run in background (you must run "docker exec -it" if you want controll the deattached containers)
# --rm = remove container after container exited
# --network NETWORK_NAME = assign docker network for container
# --name CONTAINER_ALIAS = assign a fixed container alias (in docker image you could use like ip address), default is random names
