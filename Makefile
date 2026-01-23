ROOT := $(abspath .)

.PHONY: install install-connectors install-data-models install-logging-utils install-authorizer \
	build build-connectors build-data-models build-logging-utils build-authorizer build-control-api \
	dev-http-source clean test test-authorizer test-connector-http-source test-control-api install-control-api \
	test-worker-jsonata

install: install-connectors install-data-models install-logging-utils install-authorizer install-control-api

install-connectors:
	cd $(ROOT)/packages/connector-core && npm install
	cd $(ROOT)/services/connector-http-source && npm install
	cd $(ROOT)/services/connector-http-sink && npm install

install-data-models:
	cd $(ROOT)/packages/data-models && npm install

install-logging-utils:
	cd $(ROOT)/packages/logging-utils && npm install

install-authorizer:
	cd $(ROOT)/services/authorizer && npm install

install-control-api:
	cd $(ROOT)/services/control-api && npm install

build: build-connectors build-data-models build-logging-utils build-authorizer build-control-api

build-connectors:
	cd $(ROOT)/packages/connector-core && npm run build
	cd $(ROOT)/services/connector-http-source && npm run build
	cd $(ROOT)/services/connector-http-sink && npm run build

build-data-models:
	cd $(ROOT)/packages/data-models && npm run build

build-logging-utils:
	cd $(ROOT)/packages/logging-utils && npm run build

build-authorizer:
	cd $(ROOT)/services/authorizer && npm run build

build-control-api:
	cd $(ROOT)/services/control-api && npm run build

dev-http-source:
	cd $(ROOT)/services/connector-http-source && npm run dev

clean:
	cd $(ROOT)/packages/connector-core && rm -rf dist node_modules
	cd $(ROOT)/services/connector-http-source && rm -rf dist node_modules
	cd $(ROOT)/services/connector-http-sink && rm -rf dist node_modules
	cd $(ROOT)/packages/data-models && rm -rf dist node_modules
	cd $(ROOT)/packages/logging-utils && rm -rf dist node_modules
	cd $(ROOT)/services/authorizer && rm -rf dist node_modules
	cd $(ROOT)/services/control-api && rm -rf dist node_modules

test: test-authorizer test-connector-http-source test-connector-http-sink test-control-api test-worker-jsonata

test-authorizer:
	cd $(ROOT)/services/authorizer && npm test

test-connector-http-source:
	cd $(ROOT)/services/connector-http-source && npm test

test-connector-http-sink:
	cd $(ROOT)/services/connector-http-sink && npm test

test-control-api:
	cd $(ROOT)/services/control-api && npm test

test-worker-jsonata:
	cd $(ROOT)/services/worker-jsonata && npm test
