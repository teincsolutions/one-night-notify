pipeline {
    agent { node { label 'teinc-agent' } }

    environment {
        DOCKER_IMAGE = 'one-night-notify'
        DOCKER_REGISTRY = 'docker.io'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out code from SCM...'
                checkout scm
                script {
                    env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.GIT_BRANCH = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    env.GIT_AUTHOR = sh(returnStdout: true, script: 'git log -1 --pretty=format:"%an"').trim()
                    env.DOCKER_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
                    echo "Branch: ${env.GIT_BRANCH}, Commit: ${env.GIT_COMMIT.take(7)}, Author: ${env.GIT_AUTHOR}, Tag: ${env.DOCKER_TAG}"
                }
            }
        }

        stage('Install Docker CLI') {
            steps {
                script {
                    sh '''
                        if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
                            echo "Installing Docker CLI and Docker Compose..."
                            apt-get update
                            apt-get install -y ca-certificates curl gnupg lsb-release
                            rm -f /usr/share/keyrings/docker-archive-keyring.gpg
                            curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --batch --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
                            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
                            apt-get update
                            apt-get remove -y docker-buildx || true
                            apt-get install -y docker-ce-cli docker-compose-plugin
                        fi
                    '''
                }
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    // Set up environment variables for the application
                    withCredentials([
                        string(credentialsId: 'smtp-user', variable: 'SMTP_USER'),
                        string(credentialsId: 'smtp-pass', variable: 'SMTP_PASS'),
                        string(credentialsId: 'contact-email', variable: 'CONTACT_EMAIL')
                    ]) {
                        sh '''
                            echo "Setting up environment variables..."
                            envsubst < .env.example > .env
                            echo "Environment file created successfully"
                        '''
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build Docker image
                    sh """
                        echo "Building Docker image..."
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG} .
                        docker tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    """
                }
            }
        }

        stage('Test Docker Image') {
            steps {
                script {
                    // Test the Docker image by running it briefly
                    sh """
                        echo "Testing Docker image..."
                        docker stop one-night-notify-test || true
                        docker rm one-night-notify-test || true
                        docker run -d --name one-night-notify-test --network notify-network ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}
                        sleep 30
                        if curl -f http://one-night-notify-test:4000 > /dev/null 2>&1; then
                            echo "Image test passed!"
                        else
                            echo "ERROR: Image test failed"
                            exit 1
                        fi
                        docker stop one-night-notify-test || true
                    """
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    // Login to Docker Hub
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh """
                            echo "Logging into Docker Hub..."
                            echo \$DOCKER_PASSWORD | docker login ${DOCKER_REGISTRY} -u \$DOCKER_USERNAME --password-stdin
                        """
                    }

                    // Push Docker image to registry
                    sh """
                        echo "Pushing Docker image to registry..."
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Deploy using docker compose
                    sh '''
                        echo "Deploying application..."
                        docker compose down || true
                        docker compose pull
                        docker compose up -d
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    // Wait for application to be healthy
                    sh '''
                        echo "Performing health check..."
                        for i in {1..30}; do
                            if curl -f http://notify-api:4000 > /dev/null 2>&1; then
                                echo "Application is healthy!"
                                break
                            fi
                            echo "Waiting for application to be healthy... (attempt $i/30)"
                            sleep 10
                        done

                        # Final health check
                        if ! curl -f http://notify-api:4000 > /dev/null 2>&1; then
                            echo "ERROR: Application failed health check"
                            exit 1
                        fi
                    '''
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    // Clean up old Docker images
                    sh '''
                        echo "Cleaning up old Docker images..."
                        docker image prune -f
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded! Application deployed successfully.'
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_WEBHOOK_URL')]) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' --data '{
                            "username": "Jenkins",
                            "icon_emoji": ":white_check_mark:",
                            "attachments": [{
                                "color": "good",
                                "text": "✅ Pipeline succeeded! Application deployed successfully.",
                                "fields": [
                                    {
                                        "title": "Build",
                                        "value": "${env.BUILD_NUMBER}",
                                        "short": true
                                    },
                                    {
                                        "title": "Job",
                                        "value": "${env.JOB_NAME}",
                                        "short": true
                                    }
                                ]
                            }]
                        }' \$SLACK_WEBHOOK_URL
                    """
                }
            }
        }
        failure {
            echo 'Pipeline failed! Check the logs for details.'
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_WEBHOOK_URL')]) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' --data '{
                            "username": "Jenkins",
                            "icon_emoji": ":x:",
                            "attachments": [{
                                "color": "danger",
                                "text": "❌ Pipeline failed! Check the logs for details.",
                                "fields": [
                                    {
                                        "title": "Build",
                                        "value": "${env.BUILD_NUMBER}",
                                        "short": true
                                    },
                                    {
                                        "title": "Job",
                                        "value": "${env.JOB_NAME}",
                                        "short": true
                                    },
                                    {
                                        "title": "Build URL",
                                        "value": "${env.BUILD_URL}",
                                        "short": false
                                    }
                                ]
                            }]
                        }' \$SLACK_WEBHOOK_URL
                    """
                }
            }
        }
        always {
            // Clean up workspace
            deleteDir()
        }
    }
}