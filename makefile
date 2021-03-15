SHELL := bash
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
.RECIPEPREFIX +=

.PHONY: all clean tarball

DIR := $(shell basename "$(shell pwd)")
BASE_NAME = miki-desktop
IMAGE_NAME = $(BASE_NAME)-${TAG}
PRODUCT_NAME = Miki Desktop
DOCKERFILE = ./Dockerfile

all: synchronize

tarball:
  rm -f ${HOME}/mimix/fkd/mkadm/dat/miki-desktop.tar.xz
  pushd ..
  tar -cJf ${HOME}/mimix/fkd/mkadm/dat/miki-desktop.tar.xz --exclude=".git*" miki-desktop
  popd
