pipeline {
    agent any
    
    parameters {
        string(name: 'DOCKER_USERNAME', defaultValue: 'maitritrivedi', description: 'Docker Hub username')
    }
    
    environment {
        DOCKER_PASSWORD = credentials('docker-password')
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
        
        stage('Docker Build') {
            steps {
                sh """
                # Copy the build directory to the correct location for Docker
                cp -r intelliview-frontend/build .
                
                # Build the Docker image
                DOCKER_BUILDKIT=1 docker build -t ${params.DOCKER_USERNAME}/intelliview-frontend:${BUILD_NUMBER} .
                """
            }
        }
        
        stage('Docker Push') {
            steps {
                sh """
                echo ${DOCKER_PASSWORD} | docker login -u ${params.DOCKER_USERNAME} --password-stdin
                docker push ${params.DOCKER_USERNAME}/intelliview-frontend:${BUILD_NUMBER}
                """
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                sh """
                # Replace templated values in frontend deployment YAML
                cat kubernetes/frontend-deployment.yaml | 
                sed 's|\${DOCKER_USERNAME}|${params.DOCKER_USERNAME}|g' | 
                sed 's|\${BUILD_NUMBER}|${BUILD_NUMBER}|g' > frontend-deployment-final.yaml
                
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
            cleanWs()
        }
    }
} 