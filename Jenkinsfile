pipeline {
    agent any
    
    parameters {
        string(name: 'DOCKER_USERNAME', defaultValue: 'maitritrivedi', description: 'Docker Hub username')
    }
    
    environment {
        DOCKER_CREDENTIALS = credentials('DockerHubCredential')
        DOCKER_REGISTRY = 'docker.io/mtrivedi1410'
        IMAGE_NAME = 'intelliview-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        NPM_CONFIG_CACHE = '.npm-cache'
        WORKSPACE = "${WORKSPACE}"
        DOCKER_BUILDKIT = '0'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh '''
                cd intelliview-frontend
                npm install --legacy-peer-deps
                '''
            }
        }
        
        stage('Build React App') {
            steps {
                sh '''
                cd intelliview-frontend
                npm run build
                
                # Verify build directory exists
                if [ ! -d "build" ]; then
                    echo "Build directory not found! Build may have failed."
                    exit 1
                fi
                '''
            }
        }
        
        stage('Docker Build and Push') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'DockerHubCredential', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh """
                        # Copy the build directory to the correct location for Docker
                        cp -r intelliview-frontend/build .
                        
                        # Build the Docker image
                        DOCKER_BUILDKIT=1 docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                        
                        # Login to Docker Hub
                        echo \${DOCKER_PASS} | docker login -u \${DOCKER_USER} --password-stdin
                        
                        # Push the image
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                sh """
                # Replace templated values in frontend deployment YAML
                cat kubernetes/frontend-deployment.yaml | 
                sed 's|\${DOCKER_REGISTRY}|${DOCKER_REGISTRY}|g' | 
                sed 's|\${IMAGE_NAME}|${IMAGE_NAME}|g' | 
                sed 's|\${IMAGE_TAG}|${IMAGE_TAG}|g' > frontend-deployment-final.yaml
                
                # Apply to Kubernetes cluster
                kubectl apply -f frontend-deployment-final.yaml
                
                # Wait for deployment to complete
                kubectl rollout status deployment/intelliview-frontend --timeout=300s
                
                # Show URL
                FRONTEND_PORT=\$(kubectl get svc intelliview-frontend -o jsonpath='{.spec.ports[0].nodePort}')
                MINIKUBE_IP=\$(minikube ip)
                echo "Frontend is accessible at: http://\$MINIKUBE_IP:\$FRONTEND_PORT"
                """
            }
        }
    }
    
    post {
        always {
            echo "Cleaning up workspace..."
            sh 'docker logout || true'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
} 