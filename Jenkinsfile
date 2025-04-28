pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'intelliview-frontend'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir('intelliview_frontend/intelliview-frontend') {
                    sh 'npm install'
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                dir('intelliview_frontend/intelliview-frontend') {
                    sh 'npm test -- --watchAll=false'
                }
            }
        }
        
        stage('Build') {
            steps {
                dir('intelliview_frontend/intelliview-frontend') {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                dir('intelliview_frontend/intelliview-frontend') {
                    sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    // Stop existing container if running
                    sh "docker stop ${DOCKER_IMAGE} || true"
                    sh "docker rm ${DOCKER_IMAGE} || true"
                    
                    // Run new container
                    sh "docker run -d --name ${DOCKER_IMAGE} -p 3000:80 ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }
    }
    
    post {
        failure {
            emailext body: 'Frontend build failed. Please check Jenkins for details.',
                     subject: 'Frontend Build Failure',
                     to: '${EMAIL_RECIPIENTS}'
        }
    }
} 