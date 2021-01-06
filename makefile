SHELL := bash
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
.RECIPEPREFIX +=

.PHONY: all clean build install_streams install_world save linux_package linux_installers windows_package windows_installers macos_package macos_installers node_appdmg macos_install_streams

DIR := $(shell basename "$(shell pwd)")
BASE_NAME = nebula
IMAGE_NAME = $(BASE_NAME)-${TAG}
PRODUCT_NAME = Mimix Nebula
DOCKERFILE = ./Dockerfile
STREAMS_DIR = ./app/streams
WORLD_DIR = ./app/world

all: build save

build: install_streams install_world
  docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .

clean:
  rm -rf out
  rm -rf node_modules

install:
  npm install

start:
  npm start

install_streams:
  rm -rf $(STREAMS_DIR)
  mkdir -p $(STREAMS_DIR)
  cp -v ${ENGINE_RELEASES}/streams_unix_X64 $(STREAMS_DIR)

install_world:
  rm -rf $(WORLD_DIR)
  git clone ${VIEWER_SOURCES} $(WORLD_DIR)

save:
  mkdir -p ${RELEASES}/docker/$(BASE_NAME)/${TAG}
  docker save -o ${RELEASES}/docker/$(BASE_NAME)/${TAG}/docker-$(IMAGE_NAME).tar $(IMAGE_NAME)
  gzip -f ${RELEASES}/docker/$(BASE_NAME)/${TAG}/docker-$(IMAGE_NAME).tar

run:
  docker run -it --rm -e DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix $(IMAGE_NAME)

linux_package:
  electron-packager . --platform=linux --out=out --icon=assets/icons/icon.png --overwrite

linux_installers:
  electron-builder --linux --prepackaged "out/$(PRODUCT_NAME)-linux-x64"

windows_package:
  electron-packager . --platform=win32 --out=out --icon=assets/icons/icon.ico --overwrite

windows_installers:
  electron-builder --windows --prepackaged "out/$(PRODUCT_NAME)-win32-x64"

node_appdmg:
  npm install -g appdmg

macos_install_streams:
  rm -rf $(STREAMS_DIR)
  mkdir -p $(STREAMS_DIR)
  cp -v ${RELEASES}/streams_macos_X64 $(STREAMS_DIR)

macos_package: macos_install_streams
  electron-packager . --platform=darwin --out=out --icon=assets/icons/icon.icns --overwrite

macos_installers: macos_package node_appdmg
  rm -rf "${RELEASES}/macos/$(BASE_NAME)/${TAG}"
  mkdir -p "${RELEASES}/macos/$(BASE_NAME)/${TAG}/app"
  mkdir -p "${RELEASES}/macos/$(BASE_NAME)/${TAG}/installers"
  mv -f "out/$(PRODUCT_NAME)-darwin-x64/$(PRODUCT_NAME).app" "${RELEASES}/macos/$(BASE_NAME)/${TAG}/app"
  cp -r "${RELEASES}/macos/$(BASE_NAME)/${TAG}/app/$(PRODUCT_NAME).app" .
  appdmg nebula-dmg.json "out/$(PRODUCT_NAME)-${TAG}.dmg"
  mv -f "out/$(PRODUCT_NAME)-${TAG}.dmg" "${RELEASES}/macos/$(BASE_NAME)/${TAG}/installers"
  rm -rf "$(PRODUCT_NAME).app"
