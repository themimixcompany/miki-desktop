SHELL := bash
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
.RECIPEPREFIX +=

.PHONY: all clean synchronize

DIR := $(shell basename "$(shell pwd)")
BASE_NAME = miki-desktop
IMAGE_NAME = $(BASE_NAME)-${TAG}
PRODUCT_NAME = Miki Desktop
DOCKERFILE = ./Dockerfile

all: synchronize

synchronize:
  rsync -avz --delete --exclude node_modules ./ pegasus:Desktop/miki-desktop
