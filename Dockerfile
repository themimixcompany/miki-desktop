FROM ubuntu:bionic

# Set metadata
LABEL maintainer="The Mimix Company <code@mimix.io>"
LABEL version="0.0.8"
LABEL description="Dockerfile for Nebula"

# Install base packages
RUN apt-get update -y
RUN apt-get install -y software-properties-common build-essential curl sudo git unzip
RUN apt-get install -y libx11-xcb1 libgtk-3-0 libnss3 libxss1 libasound2 libssl1.1
RUN apt-get install -y libxcb-dri3-0 libdrm2 libgbm1

# Install Node.js and friends
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN npm config set user 0
RUN npm config set unsafe-perm true
RUN npm install -g electron
RUN npm install -g electron-packager

# Stage the app
RUN mkdir -p /var/lib/staging
ADD . /var/lib/staging
RUN (cd /var/lib/staging; npm install; electron-packager . --platform=linux --out=out --icon=assets/icons/icon.png --prune=true)

# Install the app
RUN mkdir -p /app
RUN mv /var/lib/staging/out/"Mimix Nebula"-linux-x64 /app/nebula

# Run the app
CMD [ "/app/nebula/Mimix Nebula", "--no-sandbox" ]
