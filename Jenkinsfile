pipeline {
    agent { node { label 'teinc-agent' } }

    environment {
        DOCKER_IMAGE = 'one-night-notify'
        DOCKER_REGISTRY = 'docker.io'
        PORT = '4000'
        RATE_LIMIT_POINTS = '100'
        RATE_LIMIT_DURATION = '60'
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
                        string(credentialsId: 'database-url', variable: 'DATABASE_URL'),
                        string(credentialsId: 'redis-url', variable: 'REDIS_URL'),
                        string(credentialsId: 'firebase-service-account-json', variable: 'FIREBASE_SERVICE_ACCOUNT_JSON'),
                        string(credentialsId: 'api-key-master', variable: 'API_KEY_MASTER'),
                        string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET'),
                    ]) {
                        sh '''
                            echo "Setting up environment variables..."
                            envsubst < .env.template > .env
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
                        docker run -d --name one-night-notify-test --network one-night-network ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}
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

        stage('Database Migration') {
            steps {
                script {
                    // Run database migration
                    withCredentials([
                        string(credentialsId: 'database-url', variable: 'DATABASE_URL')
                    ]) {
                        sh """
                            echo "Running database migration..."
                            docker run --rm -e DATABASE_URL=\$DATABASE_URL ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest npx prisma migrate deploy
                            echo "Database migration completed successfully"
                        """
                    }
                }
            }
        }

        stage('Seed Database') {
            steps {
                script {
                    // Run database seeding
                    withCredentials([
                        string(credentialsId: 'database-url', variable: 'DATABASE_URL')
                    ]) {
                        sh """
                            echo "Seeding database..."
                            docker run --rm -e DATABASE_URL=\$DATABASE_URL ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest npm run seed
                            echo "Database seeding completed successfully"
                        """
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Deploy using docker compose production file
                    sh '''
                        echo "Deploying application..."
                        docker compose -f docker-compose.production.yml down || true
                        docker compose -f docker-compose.production.yml pull
                        docker compose -f docker-compose.production.yml up -d
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
                            if curl -f http://notifications-api:4000 > /dev/null 2>&1; then
                                echo "Application is healthy!"
                                break
                            fi
                            echo "Waiting for application to be healthy... (attempt $i/30)"
                            sleep 10
                        done

                        # Final health check
                        if ! curl -f http://notifications-api:4000 > /dev/null 2>&1; then
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