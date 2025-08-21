# Define the image name
IMAGE_NAME := real-time-event-processing
LOCAL_IMAGE_NAME := $(IMAGE_NAME)-local

# Build the Docker image for production
build:
	docker build -t $(IMAGE_NAME) .

# Build the Docker image for local development
build-local:
	docker build -t $(LOCAL_IMAGE_NAME) -f Dockerfile.local .

# Run the application using Docker (production)
run: build
	docker run -p 5000:5000 $(IMAGE_NAME)

# Run the application using Docker (local development)
run-local: build-local
	docker run -p 5000:5000 $(LOCAL_IMAGE_NAME)

# Run tests using Docker (production)
test: build
	docker run $(IMAGE_NAME) npm test

# Run tests using Docker (local development)
test-local: build-local
	docker run $(LOCAL_IMAGE_NAME) npm test

# Run unit tests using Docker (production)
unit-test: build
	docker run $(IMAGE_NAME) npm run test:unit

# Run unit tests using Docker (local development)
unit-test-local: build-local
	docker run $(LOCAL_IMAGE_NAME) npm run test:unit

# Run end-to-end tests using Docker (production)
e2e-test: build
	docker run $(IMAGE_NAME) npm run test:e2e

# Run end-to-end tests using Docker (local development)
e2e-test-local: build-local
	docker run $(LOCAL_IMAGE_NAME) npm run test:e2e

# Stop and remove the container (production)
clean:
	docker stop $(shell docker ps -a -q --filter name=$(IMAGE_NAME)) || true
	docker rm $(shell docker ps -a -q --filter name=$(IMAGE_NAME)) || true
	docker rmi $(IMAGE_NAME) || true

# Stop and remove the container (local development)
clean-local:
	docker stop $(shell docker ps -a -q --filter name=$(LOCAL_IMAGE_NAME)) || true
	docker rm $(shell docker ps -a -q --filter name=$(LOCAL_IMAGE_NAME)) || true
	docker rmi $(LOCAL_IMAGE_NAME) || true


# Install dependencies
install:
	npm Install
