pipeline {
    agent any
    
    options {
        timestamps()
        durabilityHint('PERFORMANCE_OPTIMIZED')
    }
    
    environment {
        DOCKER_REGISTRY = 'docker.io/mtrivedi1410'
        IMAGE_NAME = 'intelliview-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS = credentials('DockerHubCredential')
        NPM_CONFIG_CACHE = '.npm-cache'
        WORKSPACE = "${WORKSPACE}"
        DOCKER_BUILDKIT = '0'
    }
    
    stages {
        stage('Setup Node Environment') {
            agent {
                docker {
                    image 'cimg/node:18.17-browsers'
                    args '-v $HOME/.npm:/.npm'
                    reuseNode true
                }
            }
            steps {
                sh '''#!/bin/bash -xe
                    node --version
                    npm --version
                '''
            }
        }
        
        stage('Install Dependencies') {
            agent {
                docker {
                    image 'cimg/node:18.17-browsers'
                    args '-v $HOME/.npm:/.npm'
                    reuseNode true
                }
            }
            steps {
                script {
                    dir('intelliview-frontend/intelliview-frontend') {
                        sh '''#!/bin/bash -xe
                            echo "Node version: $(node --version)"
                            echo "NPM version: $(npm --version)"
                            
                            # Clean install with legacy peer deps
                            npm install --legacy-peer-deps --no-audit
                            
                            # List installed packages for debugging
                            npm list --depth=0 || true
                        '''
                    }
                }
            }
        }
        
        stage('Parallel Quality Checks') {
            parallel {
                stage('Lint') {
                    agent {
                        docker {
                            image 'cimg/node:18.17-browsers'
                            args '-v $HOME/.npm:/.npm'
                            reuseNode true
                        }
                    }
                    steps {
                        script {
                            dir('intelliview-frontend/intelliview-frontend') {
                                sh '#!/bin/bash -xe\nCI=true npm run lint:ci || true'
                            }
                        }
                    }
                }
                
                stage('Run Tests') {
                    agent {
                        docker {
                            image 'cimg/node:18.17-browsers'
                            args '-v $HOME/.npm:/.npm'
                            reuseNode true
                        }
                    }
                    steps {
                        script {
                            dir('intelliview-frontend/intelliview-frontend') {
                                sh '#!/bin/bash -xe\nnpm test -- --coverage --watchAll=false --ci --passWithNoTests --maxWorkers=2'
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build') {
            agent {
                docker {
                    image 'cimg/node:18.17-browsers'
                    args '-v $HOME/.npm:/.npm'
                    reuseNode true
                }
            }
            steps {
                script {
                    dir('intelliview-frontend/intelliview-frontend') {
                        sh '''#!/bin/bash -xe
                            export CI=true
                            export DISABLE_ESLINT_PLUGIN=true
                            npm run build
                            
                            # Verify build output exists
                            ls -la build/
                        '''
                    }
                }
            }
        }
        
        stage('Build and Push Docker Image') {
            steps {
                script {
                    dir('intelliview-frontend') {
                        withCredentials([usernamePassword(credentialsId: 'DockerHubCredential', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                            sh '''#!/bin/bash -xe
                                echo "Docker version:"
                                docker version
                                
                                echo "Pulling latest image for caching..."
                                docker pull ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest || true
                                
                                echo "Building Docker image..."
                                docker build \
                                    --cache-from ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
                                    -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                                    -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
                                    .

                                echo "Logging into Docker Hub..."
                                echo $DOCKER_PASSWORD | docker login docker.io -u $DOCKER_USERNAME --password-stdin
                                
                                echo "Pushing images..."
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                                
                                echo "Docker build and push completed successfully"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh '''#!/bin/bash -xe
                        # Install kubectl
                        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                        chmod +x kubectl
                        ./kubectl version --client
                        
                        ./kubectl get namespace intelliview || ./kubectl create namespace intelliview
                        
                        cat <<EOF | ./kubectl apply -f -
                        apiVersion: apps/v1
                        kind: Deployment
                        metadata:
                          name: intelliview-frontend
                          namespace: intelliview
                        spec:
                          replicas: 2
                          selector:
                            matchLabels:
                              app: intelliview-frontend
                          template:
                            metadata:
                              labels:
                                app: intelliview-frontend
                            spec:
                              securityContext:
                                runAsNonRoot: true
                                runAsUser: 1001
                                fsGroup: 1001
                              containers:
                              - name: intelliview-frontend
                                image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                                ports:
                                - containerPort: 80
                                env:
                                - name: REACT_APP_API_URL
                                  value: "http://intelliview-backend-service"
                                - name: REACT_APP_LLM_SERVICE_URL
                                  value: "http://intelliview-backend-service/api/llm"
                                resources:
                                  limits:
                                    cpu: "300m"
                                    memory: "256Mi"
                                  requests:
                                    cpu: "100m"
                                    memory: "128Mi"
                                securityContext:
                                  allowPrivilegeEscalation: false
                                  capabilities:
                                    drop:
                                    - ALL
                                  readOnlyRootFilesystem: true
                                livenessProbe:
                                  httpGet:
                                    path: /
                                    port: 80
                                  initialDelaySeconds: 10
                                  periodSeconds: 30
                                readinessProbe:
                                  httpGet:
                                    path: /
                                    port: 80
                                  initialDelaySeconds: 5
                                  periodSeconds: 10
                        EOF
                        
                        cat <<EOF | ./kubectl apply -f -
                        apiVersion: v1
                        kind: Service
                        metadata:
                          name: intelliview-frontend-service
                          namespace: intelliview
                        spec:
                          selector:
                            app: intelliview-frontend
                          ports:
                          - port: 80
                            targetPort: 80
                          type: ClusterIP
                        EOF
                        
                        cat <<EOF | ./kubectl apply -f -
                        apiVersion: networking.k8s.io/v1
                        kind: Ingress
                        metadata:
                          name: intelliview-ingress
                          namespace: intelliview
                          annotations:
                            nginx.ingress.kubernetes.io/rewrite-target: /
                            nginx.ingress.kubernetes.io/ssl-redirect: "true"
                            nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
                        spec:
                          rules:
                          - host: intelliview.example.com
                            http:
                              paths:
                              - path: /
                                pathType: Prefix
                                backend:
                                  service:
                                    name: intelliview-frontend-service
                                    port:
                                      number: 80
                                  - path: /api
                                    pathType: Prefix
                                    backend:
                                      service:
                                        name: intelliview-backend-service
                                        port:
                                          number: 80
                        EOF
                        
                        ./kubectl rollout status deployment/intelliview-frontend -n intelliview --timeout=180s
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                sh '''#!/bin/bash -xe
                    docker logout ${DOCKER_REGISTRY} || true
                '''
                cleanWs()
            }
        }
        success {
            echo 'Frontend pipeline completed successfully!'
        }
        failure {
            echo 'Frontend pipeline failed!'
        }
    }
} 